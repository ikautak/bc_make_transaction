import fs from 'fs';
import * as bitcoin from 'bitcoinjs-lib';
import * as ecc from 'tiny-secp256k1';
import ECPairFactory from 'ecpair';

const ECPair = ECPairFactory(ecc);
const validator = (
  pubkey: Buffer,
  msghash: Buffer,
  signature: Buffer,
): boolean => ECPair.fromPublicKey(pubkey).verify(msghash, signature);

/**
 * input json type info
 */
type TxInput = {
  transactionId: string,
  transactionIndex: number,
  sequence: number
  utxo: string,
  wif: string,
};

type TxOutput = {
  address: string,
  value: number,
};

type Param = {
  testnet: boolean,
  version: number,
  locktime: number,
  input: TxInput[],
  output: TxOutput[],
};

/**
 * make transaction from Param, return hex
 */
const makeTransaction = (param: Param) => {
  const network = param.testnet ? bitcoin.networks.testnet : bitcoin.networks.bitcoin;
  const psbt = new bitcoin.Psbt({ network });

  psbt.setVersion(param.version);
  psbt.setLocktime(param.locktime);

  for (const input of param.input) {
    psbt.addInput({
      hash: input.transactionId,
      index: input.transactionIndex,
      sequence: input.sequence,
      nonWitnessUtxo: Buffer.from(input.utxo, 'hex')
    });
  }

  for (const output of param.output) {
    psbt.addOutput({
      address: output.address,
      value: output.value,
    });
  }

  for (const [index, input] of param.input.entries()) {
    const pair = ECPair.fromWIF(input.wif, network);
    psbt.signInput(index, pair);
  }

  psbt.validateSignaturesOfAllInputs(validator);
  psbt.finalizeAllInputs();
  return psbt.extractTransaction().toHex();
}

const main = () => {
  // check param
  if (process.argv.length <= 2) {
    console.error('input param json file');
    process.exit(1);
  }
  console.log(process.argv[2]);

  // read input json
  // TODO type assertion
  const param = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')) as Param;

  const tx = makeTransaction(param);
  console.log(tx);
}

main();
