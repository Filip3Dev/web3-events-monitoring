const { ethers } = require("ethers");
const Staking = require('./abis/Staking.json');
const Token = require('./abis/Token.json');
const Faucet = require('./abis/Faucet.json');
const Koa = require('koa');
const app = new Koa();
require('dotenv').config()
const logger = require('logzio-nodejs').createLogger({
  token: process.env.LOGZIO_KEY,
  protocol: 'https',
  host: 'listener.logz.io',
  port: '8071',
  type: 'web3_logs'
});


const initalize = async () => {
  const provider = await new ethers.providers.AlchemyProvider("rinkeby", process.env.ALCHE_KEY);
  const infuraContract = await new ethers.Contract(process.env.STAKING, Staking.abi, provider);
  const tkContract = await new ethers.Contract(process.env.TOKEN, Token.abi, provider);
  const fauContract = await new ethers.Contract(process.env.FAUCET, Faucet.abi, provider);
  return {
    provider,
    staking: infuraContract,
    token: tkContract,
    faucet: fauContract
  }
}

const start = async () => {
  const { staking, token, faucet } = await initalize();
  staking.on("Deposit", (address, amount, event) => {
    let value = ethers.utils.formatUnits(amount.toString(), "ether");
    let obj = {
      address,
      amount: Number(value),
      block: event.blockNumber,
      contract: event.address,
      hash: event.transactionHash,
      event: event.event.toLowerCase()
    }
    console.log('Deposit: ', obj);
    logger.log(obj);
  })
  staking.on("Withdraw", (owner, amount, event) => {
    let value = ethers.utils.formatUnits(amount.toString(), "ether");
    let obj = {
      address: owner,
      amount: Number(value),
      block: event.blockNumber,
      contract: event.address,
      hash: event.transactionHash,
      event: event.event.toLowerCase()
    }
    console.log('Withdraw: ', obj);
    logger.log(obj);
  })
  staking.on("Claim", (stakeHolder, amount, event) => {
    let value = ethers.utils.formatUnits(amount.toString(), "ether");
    let obj = {
      address: stakeHolder,
      amount: Number(value),
      block: event.blockNumber,
      contract: event.address,
      hash: event.transactionHash,
      event: event.event.toLowerCase()
    }
    console.log('Claim: ', obj);
    logger.log(obj);
  })
  staking.on("StartStaking", (startPeriod, lockupPeriod, endingPeriod, event) => {
    let obj = {
      address: null,
      startPeriod,
      lockupPeriod,
      endingPeriod,
      amount: '0',
      block: event.blockNumber,
      contract: event.address,
      hash: event.transactionHash,
      event: event.event.toLowerCase()
    }
    console.log('StartStaking: ', obj);
    logger.log(obj);
  })
  token.on("Transfer", (from, to, value, event) => {
    let amount = ethers.utils.formatUnits(value.toString(), "ether");
    let obj = {
      address: null,
      from,
      to,
      amount: Number(amount),
      block: event.blockNumber,
      contract: event.address,
      hash: event.transactionHash,
      event: event.event.toLowerCase()
    }
    console.log('Transfer: ', obj);
    logger.log(obj);
  })
  token.on("Approval", (owner, spender, value, event) => {
    let amount = ethers.utils.formatUnits(value.toString(), "ether");
    let obj = {
      address: null,
      from: owner,
      to: spender,
      amount: Number(amount),
      block: event.blockNumber,
      contract: event.address,
      hash: event.transactionHash,
      event: event.event.toLowerCase()
    }
    console.log('Approval: ', obj);
    logger.log(obj);
  })
  faucet.on("Claim", (user, amount, event) => {
    let value = ethers.utils.formatUnits(amount.toString(), "ether");
    let obj = {
      address: user,
      amount: Number(value),
      block: event.blockNumber,
      contract: event.address,
      hash: event.transactionHash,
      event: `faucet_${event.event.toLowerCase()}`
    }
    console.log('Claim: ', obj);
    logger.log(obj);
  })
  faucet.on("OwnershipTransferred", (previousOwner, newOwner, event) => {
    let obj = {
      address: null,
      from: previousOwner,
      to: newOwner,
      amount: '0',
      block: event.blockNumber,
      contract: event.address,
      hash: event.transactionHash,
      event: event.event.toLowerCase()
    }
    console.log('OwnershipTransferred: ', obj);
    logger.log(obj);
  })
}

app.use(async (ctx, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  ctx.set('X-Response-Time', `${ms}ms`);
});

app.use(async ctx => {
  const { staking, token, faucet } = await initalize();
  let total = await staking.functions.totalDeposited();
  let faucetBalance = await faucet.functions.faucetBalance();
  let totalSupply = await token.functions.totalSupply();
  ctx.body = {
    totalDeposited: Number(ethers.utils.formatUnits(total.toString(), "ether")),
    faucetBalance: Number(ethers.utils.formatUnits(faucetBalance.toString(), "ether")),
    totalSupply: Number(ethers.utils.formatUnits(totalSupply.toString(), "ether")),
    date: new Date().getTime()
  };
});

app.listen(process.env.PORT || 3000);

start();