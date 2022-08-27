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

// input json type info
type TxInput = {
  transactionId: string,
  transactionIndex: number,
  sequence: number
  utxo: string,
  wif: string,
}

type TxOutput = {
  address: string,
  value: number,
}

type Param = {
  version: number,
  locktime: number,
  testnet: boolean,
  input: TxInput[],
  output: TxOutput[],
}

/**
 * make transaction from Param, return hex
 */
const makeTransaction = (param: Param) => {
  const network = param.testnet ? bitcoin.networks.testnet : bitcoin.networks.bitcoin;
  const psbt = new bitcoin.Psbt({ network: network });

  psbt.setVersion(param.version);
  psbt.setLocktime(param.locktime);

  for (let index = 0; index < param.input.length; index++) {
    psbt.addInput({
      hash: param.input[index].transactionId,
      index: param.input[index].transactionIndex,
      sequence: param.input[index].sequence,
      nonWitnessUtxo: Buffer.from(param.input[index].utxo, 'hex')
    });
  }

  for (let index = 0; index < param.output.length; index++) {
    psbt.addOutput({
      address: param.output[index].address,
      value: param.output[index].value,
    });
  }

  for (let index = 0; index < param.input.length; index++) {
    const pair = ECPair.fromWIF(param.input[index].wif, network);
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
