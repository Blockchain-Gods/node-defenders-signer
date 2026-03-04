// Centralises all env access — one place, typed, no scattered process.env calls.

export default () => ({
  port: parseInt(process.env.PORT ?? '3001', 10),
  internalApiKey: process.env.INTERNAL_API_KEY,

  cloudflare: {
    accountId: process.env.CF_ACCOUNT_ID,
    d1DatabaseId: process.env.CF_D1_DATABASE_ID,
    apiToken: process.env.CF_API_TOKEN,
  },

  encryption: {
    key: process.env.WALLET_ENCRYPTION_KEY,
  },

  blockchain: {
    fujiRpcUrl:
      process.env.FUJI_RPC_URL ?? 'https://api.avax-test.network/ext/bc/C/rpc',
    signerPrivateKey: process.env.SIGNER_PRIVATE_KEY,
    faucetPrivateKey: process.env.FAUCET_PRIVATE_KEY,
    faucetThresholdAvax: process.env.FAUCET_THRESHOLD_AVAX ?? '0.05',

    faucetTopupAmountAvax: process.env.FAUCET_TOPUP_AMOUNT_AVAX ?? '0.1',
  },

  cron: {
    batchMint: process.env.BATCH_MINT_CRON ?? '*/5 * * * *',
  },
});
