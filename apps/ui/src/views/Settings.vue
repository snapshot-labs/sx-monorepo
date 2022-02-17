<template>
  <Layout>
    <h1 class="mb-4">Settings</h1>
    <div class="mb-4">
      <div class="mb-3">
        <h3 class="mb-2">Voting</h3>
        <div><b>Delay:</b> 6 hours</div>
        <div><b>Duration:</b> 3 days</div>
      </div>

      <div class="mb-3">
        <h3 class="mb-2">Proposal threshold</h3>
        <div>123 TOKEN</div>
      </div>

      <h3 class="mb-2">Controller</h3>
      <div class="border rounded-lg mb-4">
        <a class="px-4 py-3 block">
          <UiAvatar
            address="0xeF8305E140ac520225DAf050e2f71d5fBcC543e7"
            :size="24"
            class="float-left mr-2"
          />
          <h4>0xeF8...43e7</h4>
        </a>
      </div>
    </div>

    <h3 class="mb-2">Strategies</h3>
    <div class="border rounded-lg mb-4">
      <a class="px-4 py-3 block">
        <div class="float-right">0xeF8...43e7</div>
        <img
          class="inline-block mr-2"
          src="https://dynamic-assets.coinbase.com/dbb4b4983bde81309ddab83eb598358eb44375b930b94687ebe38bc22e52c3b2125258ffb8477a5ef22e33d6bd72e32a506c391caa13af64c00e46613c3e5806/asset_icons/4113b082d21cc5fab17fc8f2d19fb996165bcce635e6900f7fc2d57c4ef33ae9.png"
          height="24"
          width="24"
        />
        <h4 class="inline-block">ERC20</h4>
      </a>
    </div>

    <h3 class="mb-2">Auths</h3>
    <div class="border rounded-lg mb-4">
      <a class="px-4 py-3 block border-b">
        <h4>Ethereum signature</h4>
      </a>
      <a class="px-4 py-3 block">
        <h4>Ethereum transaction</h4>
      </a>
    </div>

    <div class="mb-4">
      <h3 class="mb-2">Execution</h3>
      <div class="border rounded-lg mb-4">
        <a class="px-4 py-3 block">
          <h4>Gnosis Zodiac</h4>
        </a>
      </div>
    </div>
  </Layout>
</template>
