import { OpenZeppelinAuthenticator } from '@snapshot-labs/sx';
import { NetworkID } from '../../types';

export type Treasury = {
  name: string;
  address: string;
  chainId: number;
};

type Governance = {
  name: string;
  about?: string;
  avatar?: string;
  externalUrl?: string;
  github?: string;
  twitter?: string;
  farcaster?: string;
  discord?: string;
  address: `0x${string}`;
  authenticators: OpenZeppelinAuthenticator[];
  quorumType?: 'for_only';
  startBlock: number;
  readOnlyTreasuries?: Treasury[];
  verified?: boolean;
};

export const GOVERNANCES: Partial<
  Record<NetworkID, Record<string, Governance>>
> = {
  eth: {
    ENS: {
      name: 'ENS',
      about: 'Your web3 username.',
      avatar:
        'ipfs://bafkreiftpnmdytmh3ccqsujvehipn5nklcsooy4janusmwt4oujrwisubm',
      externalUrl: 'https://ens.domains',
      github: 'ensdomains',
      twitter: 'ensdomains',
      farcaster: 'ensdomains',
      address: '0x323A76393544d5ecca80cd6ef2A560C6a395b7E3',
      authenticators: [
        'OpenZeppelinAuthenticator',
        'OpenZeppelinAuthenticatorSignatureV4'
      ],
      verified: true,
      startBlock: 13533772,
      readOnlyTreasuries: [
        {
          name: 'ENS Endowment',
          address: '0x4F2083f5fBede34C2714aFfb3105539775f7FE64',
          chainId: 1
        },
        {
          name: 'ETH Registrar Controller 2',
          address: '0x59E16fcCd424Cc24e280Be16E11Bcd56fb0CE547',
          chainId: 1
        },
        {
          name: 'ETH Registrar Controller',
          address: '0x253553366Da8546fC250F225fe3d25d0C782303b',
          chainId: 1
        },
        {
          name: 'Old ETH Registrar Controller',
          address: '0x283Af0B28c62C092C9727F1Ee09c02CA627EB7F5',
          chainId: 1
        }
      ]
    },
    BiFi: {
      name: 'BiFi',
      about: 'The multichain DeFi platform',
      avatar:
        'ipfs://bafkreiaepmbv4rvv5smwqper4b7i4eaczocjtrl6q63ykhsazne257hoia',
      address: '0x54F50d2f584F1DD05307aB5eB298Ba96C7d4E0ea',
      authenticators: [
        'OpenZeppelinAuthenticator',
        'OpenZeppelinAuthenticatorSignatureV4'
      ],
      startBlock: 13138295
    },
    Angle: {
      name: 'Angle',
      about:
        'Angle is a capital-efficient, over-collateralized and liquid decentralized stablecoin protocol',
      avatar:
        'ipfs://bafkreicmrvaeueoenhptjailexxd7i2wkxd2vjobjnrrgorzqejl6aqnmi',
      address: '0x59153e939c5b4721543251ff3049Ea04c755373B',
      authenticators: [
        'OpenZeppelinAuthenticator',
        'OpenZeppelinAuthenticatorSignatureV4'
      ],
      startBlock: 13473019
    },
    'Gas Dao': {
      name: 'Gas Dao',
      about:
        'The governance token for the ΞGAS DAO, a super-DAO formed with the vision of being the heartbeat and voice of the largest community of Web3 native users on the Ethereum Network, bridging the worlds of Defi, NFTs and DApps.',
      avatar:
        'ipfs://bafkreifrq6z6rbbvngo5jsmwfrjrwndwohprg5r7zqwcho5lyfdsw52w4m',
      address: '0x5B1751306597A76C8E6D2BFb8e952f8855Ed976d',
      authenticators: [
        'OpenZeppelinAuthenticator',
        'OpenZeppelinAuthenticatorSignatureV4'
      ],
      startBlock: 13897803
    },
    Silo: {
      name: 'Silo',
      about:
        'Silo is a non-custodial lending protocol to borrow any crypto asset with another.',
      avatar:
        'ipfs://bafkreiechdlyg346xituwrbofhheyieffve4p7fkotfx5eui3qglxzdebe',
      address: '0xA89163F7B2D68A8fbA6Ca36BEEd32Bd4f3EeAf61',
      authenticators: [
        'OpenZeppelinAuthenticator',
        'OpenZeppelinAuthenticatorSignatureV4'
      ],
      startBlock: 13716352
    },
    Union: {
      name: 'Union',
      about:
        'Credit is more than a tool for speculation, it’s the mechanism by which money turns into productive capital.',
      avatar:
        'ipfs://bafkreiebnm3qg5yiv64gs45ce4sa3yybokt62h2eml4ikt3nyjr2yqieb4',
      address: '0xe1b3F07a9032F0d3deDf3E96c395A4Da74130f6e',
      authenticators: [
        'OpenZeppelinAuthenticator',
        'OpenZeppelinAuthenticatorSignatureV4'
      ],
      quorumType: 'for_only',
      startBlock: 14098367
    },
    'Relevant DAO': {
      name: 'Relevant DAO',
      about: 'Relevant Protocol Governance',
      avatar:
        'ipfs://bafkreidmxhcokjz4qvx6xsqfjtog3w5apsksuqkoq6ecgafowctprbopju',
      address: '0x663d77b608B05b81B0a826a558e1665AC6e00C36',
      authenticators: [
        'OpenZeppelinAuthenticator',
        'OpenZeppelinAuthenticatorSignatureV4'
      ],
      startBlock: 14580270
    },
    'Signata DAO': {
      name: 'Signata DAO',
      about: 'DAO for the Signata Decentralized Identity Project',
      avatar:
        'ipfs://bafkreicvbjnvqq7mokufnkvnn3tf4z4tnbz2j6hbn3w3x6sh5roifjitpm',
      twitter: 'satatoken',
      discord: 'pEJu4ZjnfX',
      address: '0x3D3255D21654B9a8325DfE6353ac6B37352Eb80B',
      authenticators: [
        'OpenZeppelinAuthenticator',
        'OpenZeppelinAuthenticatorSignatureV4'
      ],
      quorumType: 'for_only',
      startBlock: 14796328
    },
    'Aggregated Finance': {
      name: 'Aggregated Finance',
      avatar:
        'ipfs://bafkreierqc2kaw2jwz67tpevn4agielt47fwh6o4znhofycicng347am2a',
      twitter: 'AGFI_Official',
      address: '0xD243F9aAfCf32e60b2e9D0FF016cf7f1552d5952',
      authenticators: [
        'OpenZeppelinAuthenticator',
        'OpenZeppelinAuthenticatorSignatureV4'
      ],
      quorumType: 'for_only',
      startBlock: 14792511
    },
    'Femboy DAO': {
      name: 'Femboy DAO',
      about:
        'FemboyDAO is a community of femboy enthusiasts aiming to launch femboy-themed crypto projects, starting with a crowdfunded NFT collection.',
      avatar:
        'ipfs://bafkreib75lhtz5owmshm2noo5irgyejkfpr3hlvvx2urjwgxxli7ratb5q',
      twitter: 'FemboyDAO',
      discord: 'MFRSxppn8D',
      address: '0x710C7E422A98963d6BA216840b1d83E77064A031',
      authenticators: [
        'OpenZeppelinAuthenticator',
        'OpenZeppelinAuthenticatorSignatureV4'
      ],
      // Not the deployment block (14524400): the governor launched with
      // timelock() pointing at an activator contract with no getMinDelay, so
      // initializeSpace reverts there. Starts right before the TimelockChange
      // to the real TimelockController at 14631487; no proposals in between.
      startBlock: 14631486
    },
    Hop: {
      name: 'Hop',
      about:
        'Hop is a multichain bridge allowing users to securely and seamlessly send tokens across networks.',
      avatar:
        'ipfs://bafkreiezgqtf5iaia552wrtrf66jguwe32hvq3wtjbfur5actgsz4ihbra',
      twitter: 'HopProtocol',
      discord: '8RTSYDGr',
      address: '0xed8Bdb5895B8B7f9Fdb3C087628FD8410E853D48',
      authenticators: [
        'OpenZeppelinAuthenticator',
        'OpenZeppelinAuthenticatorSignatureV4'
      ],
      startBlock: 14923681
    },
    'Antfarm DAO': {
      name: 'Antfarm DAO',
      about:
        'The mission of the DAO is to protect the Antfarm protocol and take the right decisions to help develop the ecosystem',
      avatar:
        'ipfs://bafkreiat67bgop6vgfqrhlv5xyirsyozi4opoycgcp2kbm2wynqhof2coq',
      twitter: 'antfarmfinance',
      discord: '6YuMk7zXsV',
      address: '0xD63123527551F037fAAc74bf5fDA5B71569cf5af',
      authenticators: [
        'OpenZeppelinAuthenticator',
        'OpenZeppelinAuthenticatorSignatureV4'
      ],
      startBlock: 16421539
    },
    'Electronic Dollar': {
      name: 'Electronic Dollar',
      about:
        '1. Maintain $1 USD peg & be fully collateralized 2. Generate yield to eUSDRSR stakers who provide overcollateralization',
      address: '0x7e880d8bD9c9612D6A9759F96aCD23df4A4650E6',
      authenticators: [
        'OpenZeppelinAuthenticator',
        'OpenZeppelinAuthenticatorSignatureV4'
      ],
      startBlock: 16687659
    },
    'PEPE CASH': {
      name: 'PEPE CASH',
      about:
        'PEPECASH the 2nd Dankest memecoin, inspired by Pepe, $PEPE coin and the Reign of Frogs. $PCASH.',
      avatar:
        'ipfs://bafkreidcwdd6vbs52oald5uh7zgr3qcce26vbgxnky4ldt7cinyb2vjkra',
      twitter: 'PepeCashwtf',
      address: '0x6B9b2828C949FC98e9D98958900e96B4145B664d',
      authenticators: [
        'OpenZeppelinAuthenticator',
        'OpenZeppelinAuthenticatorSignatureV4'
      ],
      startBlock: 17103616
    },
    Pooh: {
      name: 'Pooh',
      about:
        'POOH: decentralized movement for joy, led by online community leaders. Contribute skills/time to help it grow.',
      avatar:
        'ipfs://bafybeidh7yspm4y647qz3g4q3oabpsbmlsjkc5fqhyzcmv4osf44qkkkla',
      twitter: 'poohmoneyHQ',
      address: '0xa5DbAae3daD2784D6B61ef56f934768EfE9d1336',
      authenticators: [
        'OpenZeppelinAuthenticator',
        'OpenZeppelinAuthenticatorSignatureV4'
      ],
      startBlock: 17126389
    },
    'Bambi Cash DAO': {
      name: 'Bambi Cash DAO',
      about:
        "make Bambi the top meme token🚀! 5M+ ETH wallets hold dog coins; together, we'll soar higher. Be part of our community",
      avatar:
        'ipfs://bafybeiceknzw5cq4jximsi53r3kjwaac6gye24r5lj2m6432aovz67l6ku',
      twitter: 'bambicashcrypto',
      address: '0xee8960fbbdbB6EBbEE01c11b1F6Caac0ac9fECc6',
      authenticators: [
        'OpenZeppelinAuthenticator',
        'OpenZeppelinAuthenticatorSignatureV4'
      ],
      startBlock: 17211797
    },
    Inedible: {
      name: 'Inedible',
      about:
        "Inedible's mission is to make trading crypto as safe as possible by protecting against bot attacks, rug pulls, and more.",
      avatar:
        'ipfs://bafybeiableeysvtfnvfsiemffafgbtplesfu7ov7efcgwgnsoy7jaqqqzq',
      twitter: 'INEDIBLE_token',
      address: '0xB787139B526c6aecF5d21B1288539B94e9769BF3',
      authenticators: [
        'OpenZeppelinAuthenticator',
        'OpenZeppelinAuthenticatorSignatureV4'
      ],
      quorumType: 'for_only',
      startBlock: 17525806
    },
    Thurman: {
      name: 'Thurman',
      about:
        'Providing business lines of credit to diverse-led small businesses through an on-chain governance process.',
      avatar:
        'ipfs://bafkreid3yaawgtb3na7gqe5iyfen3jqpyo5eustphitrfvrdmovueebbmy',
      twitter: 'thurmanlabs',
      discord: '4cGfqsKRX8',
      address: '0x6518998C230Ceb7A7AD530c7088f0747604C06f5',
      authenticators: [
        'OpenZeppelinAuthenticator',
        'OpenZeppelinAuthenticatorSignatureV4'
      ],
      quorumType: 'for_only',
      startBlock: 16872857
    },
    Unlock: {
      name: 'Unlock',
      about:
        'Unlock ownership of your community, across all your platforms. The Unlock Protocol DAO has moved to Base. Please submit proposals on https://www.tally.xyz/gov/unlock-protocol',
      avatar:
        'ipfs://bafkreigqolz6nxj57bu5txf65hcu3ngukhknbtsoiayhgmj2ai7lcm4i6a',
      externalUrl: 'https://www.tally.xyz/gov/unlock-protocol',
      twitter: 'unlockProtocol',
      discord: 'https://discord.com/Ah6ZEJyTDp',
      address: '0x440d9D4E66d39bb28FB58729Cb4D3ead2A595591',
      authenticators: [
        'OpenZeppelinAuthenticator',
        'OpenZeppelinAuthenticatorSignatureV4'
      ],
      startBlock: 17576625
    },
    'Diva Staking': {
      name: 'Diva Staking',
      about:
        "Diva is an ETH Liquid Staking protocol powered by Distributed Validators that's both trustless and permissionless.",
      avatar:
        'ipfs://bafkreicqydwy2lmkregpkacmfoykkvemyjja527nhnxhfqaildv6jwwuty',
      externalUrl: 'https://www.divastaking.net/',
      twitter: 'divastaking',
      discord: 'divastaking',
      address: '0xFb6B7C11a55C57767643F1FF65c34C8693a11A70',
      authenticators: [
        'OpenZeppelinAuthenticator',
        'OpenZeppelinAuthenticatorSignatureV4'
      ],
      startBlock: 17572625
    },
    'High Yield USD': {
      name: 'High Yield USD',
      about:
        'A decentralized flatcoin that provides convenient access to DeFi yields, enabling holders to earn passive income on their capital. Governance should aim to take low to moderate risk to return high DeFi yields in order to mitigate inflation.',
      avatar:
        'ipfs://bafkreiefdkli2sjj5vmpnd3fj6kaszueuo7dkmwdmmphakj7caq25psns4',
      address: '0x22d7937438b4bBf02f6cA55E3831ABB94Bd0b6f1',
      authenticators: [
        'OpenZeppelinAuthenticator',
        'OpenZeppelinAuthenticatorSignatureV4'
      ],
      startBlock: 17097041
    },
    'ETH+': {
      name: 'ETH+',
      about:
        '1: Maintain an Ethereum-aligned Liquid Staking Token basket. 2: Positively impact the Ethereum staking distribution. 3: Provide value to ETH+ holders through diversification.',
      avatar:
        'ipfs://bafkreidpjveknt7oyaakexmu33rdxioqtm4355ww65ba4hjype4uxqcpeq',
      address: '0x239cDcBE174B4728c870A24F77540dAB3dC5F981',
      authenticators: [
        'OpenZeppelinAuthenticator',
        'OpenZeppelinAuthenticatorSignatureV4'
      ],
      startBlock: 17086220
    },
    AMKT: {
      name: 'AMKT',
      about: 'AMKT Governance',
      address: '0xb6a6f2a56693Dc4f893f8396D945f7dFe03aA9ba',
      authenticators: [
        'OpenZeppelinAuthenticator',
        'OpenZeppelinAuthenticatorSignatureV4'
      ],
      // Not the deployment block (18460699): quorum() reverts until the AMKT
      // token proxy gains vote checkpointing at 18470753, so initializeSpace
      // reverts there. First proposal is at 18471044, after the upgrade.
      startBlock: 18470752
    },
    'Vesper DAO': {
      name: 'Vesper DAO',
      about: 'Vesper DAO',
      address: '0x0F1CF46c224b1aDe0e263D51109dac1eC645d8eF',
      authenticators: [
        'OpenZeppelinAuthenticator',
        'OpenZeppelinAuthenticatorSignatureV4'
      ],
      startBlock: 18470591
    },
    'USDC+': {
      name: 'USDC+',
      about:
        'A community governed yield bearing USDC index optimized for yield to holders and overcollateralization protection. 1. Be fully collateralized. 2. Generate yield to USDC+ holders and stakers who provide overcollateralization.',
      address: '0xc837C557071D604bCb1058c8c4891ddBe8FDD630',
      authenticators: [
        'OpenZeppelinAuthenticator',
        'OpenZeppelinAuthenticatorSignatureV4'
      ],
      startBlock: 18171201
    },
    Increment: {
      name: 'Increment',
      about: 'Increment Governor',
      avatar:
        'ipfs://bafkreifgmhmloowxsf2gohemir3ptzcbgknk6ktnuh2q2jfbewk5xdb4my',
      externalUrl: 'https://increment.finance/',
      twitter: 'IncrementHQ',
      address: '0x134E7ABaF7E8c440f634aE9f5532A4df53c19385',
      authenticators: [
        'OpenZeppelinAuthenticator',
        'OpenZeppelinAuthenticatorSignatureV4'
      ],
      startBlock: 16978923
    },
    BytomDAO: {
      name: 'BytomDAO',
      about: 'Build the bridge from Web3 to AGI',
      avatar:
        'ipfs://bafkreidq5qu6igoobz5jyk4p3m7j7saebdxey2uocm5k24ofyiqxckklaq',
      externalUrl: 'https://bytomdao.org/',
      twitter: 'BytomDAO',
      address: '0x44214252CEdA1B087cF5D7D08d26a5913f31D40d',
      authenticators: [
        'OpenZeppelinAuthenticator',
        'OpenZeppelinAuthenticatorSignatureV5'
      ],
      startBlock: 19432522
    },
    'Xypher Council': {
      name: 'Xypher Council',
      about:
        'Pioneering the unseen paths of blockchain altruism. Where innovation meets anonymity to forge a future of decentralized good.',
      avatar:
        'ipfs://bafybeienl6ksonugs736ese2mzxgjmue7pqfiatl7bmyqkqokkefbeanbq',
      externalUrl: 'https://www.xyphercouncil.com',
      twitter: 'XypherCouncil',
      address: '0xcDC6B1308B5C13B9c9077467711BF9Bc0C7B9C8e',
      authenticators: [
        'OpenZeppelinAuthenticator',
        'OpenZeppelinAuthenticatorSignatureV5'
      ],
      startBlock: 20744394
    },
    'Lendefi DAO': {
      name: 'Lendefi DAO',
      about: 'Making DeFi Lending Great Again!',
      avatar:
        'ipfs://bafkreielxmsodfqif43crigddhqkvhtclah4vx4fakgpc6hqtftmr3nmca',
      externalUrl: 'https://lendefi.org',
      twitter: 'LendefiDAO',
      address: '0xB094C6ed74A83405A700d235496557bAFDEF2551',
      authenticators: [
        'OpenZeppelinAuthenticator',
        'OpenZeppelinAuthenticatorSignatureV5'
      ],
      startBlock: 22184783
    },
    'PEACE COIN PROTOCOL DAO': {
      name: 'PEACE COIN PROTOCOL DAO',
      about: 'PEACE COIN PROTOCOL DAO',
      address: '0x00831a36ce3535EFFeFe54BaD0bb8dE27687a237',
      authenticators: [
        'OpenZeppelinAuthenticator',
        'OpenZeppelinAuthenticatorSignatureV5'
      ],
      startBlock: 23302941
    },
    'ZEUS CC8 Community Takeover': {
      name: 'ZEUS CC8 Community Takeover',
      about:
        "ZEUS Pepes Dog Community Takeover is a DAO that governs the community's resources and decides on the initiatives that the Zeus Army carries out for the ZEUS project.",
      avatar:
        'ipfs://bafybeicyicuestfnitq36yp3vd4abmtje7omehb2yesokdff6drlvm5odq',
      externalUrl: 'https://www.zeuscoin.vip/',
      twitter: 'zeuscoineth_',
      address: '0x9499DB1A80c7b8F9C6d87510116d93eD4999eA15',
      authenticators: [
        'OpenZeppelinAuthenticator',
        'OpenZeppelinAuthenticatorSignatureV5'
      ],
      startBlock: 23618250
    },
    'Lightchain AI DAO': {
      name: 'Lightchain AI DAO',
      about:
        'Lightchain AI DAO governs and scales Lightchain’s open network, enabling token holders to propose, discuss, and vote on upgrades, funding, and partnerships. To participate in governance or delegate voting power, visit https://ballots.lightchain.ai.',
      avatar:
        'ipfs://bafkreiferi5hnww3wvtbykvujcgyxacv5pfz4ej2hipyrxdtk2lt2k4pg4',
      externalUrl: 'https://lightchain.ai/',
      twitter: 'LightchainAI',
      discord: 'https://discord.com/lightchain',
      address: '0x6dfa413B5900a1a7947BC75E68AbBA093cB2492d',
      authenticators: [
        'OpenZeppelinAuthenticator',
        'OpenZeppelinAuthenticatorSignatureV5'
      ],
      startBlock: 24350285
    },
    Flayer: {
      name: 'Flayer',
      about:
        'FLAY powers protocols built by Flayer Labs including the Flaunch.gg protocol - a memecoin launchpad built on Base and powered by Uniswap V4.',
      avatar:
        'ipfs://bafkreidy476kwd5qcqaun34okhftmzpqozzxnnsiq5fxl72tr5ocsxdzta',
      externalUrl: 'https://flaunch.gg',
      twitter: 'flaunchgg',
      discord: 'flaunch',
      address: '0x8BA5eA8c8b1Aafe9dbcb7a36737AcfAd6afa5D38',
      authenticators: [
        'OpenZeppelinAuthenticator',
        'OpenZeppelinAuthenticatorSignatureV5'
      ],
      startBlock: 21675197
    }
  },
  bnb: {
    BNB: {
      name: 'BNB Chain',
      avatar:
        'ipfs://bafkreibll4la7wqerzs7zwxjne2j7ayynbg2wlenemssoahxxj5rbt6c64',
      externalUrl: 'https://www.bnbchain.org',
      github: 'bnb-chain',
      twitter: 'BNBChain',
      address: '0x0000000000000000000000000000000000002004',
      authenticators: [
        'OpenZeppelinAuthenticator',
        'OpenZeppelinAuthenticatorSignatureV4'
      ],
      quorumType: 'for_only',
      verified: true,
      startBlock: 37959559
    },
    'Lendefi DAO': {
      name: 'Lendefi DAO',
      about: 'Making DeFi Lending Great Again!',
      avatar:
        'ipfs://bafkreielxmsodfqif43crigddhqkvhtclah4vx4fakgpc6hqtftmr3nmca',
      externalUrl: 'https://lendefi.org',
      twitter: 'LendefiDAO',
      address: '0xB094C6ed74A83405A700d235496557bAFDEF2551',
      authenticators: [
        'OpenZeppelinAuthenticator',
        'OpenZeppelinAuthenticatorSignatureV5'
      ],
      startBlock: 53441556
    }
  },
  bnbt: {
    BNB: {
      name: 'BNB Chain',
      avatar:
        'ipfs://bafkreibll4la7wqerzs7zwxjne2j7ayynbg2wlenemssoahxxj5rbt6c64',
      externalUrl: 'https://www.bnbchain.org',
      github: 'bnb-chain',
      twitter: 'BNBChain',
      address: '0x0000000000000000000000000000000000002004',
      authenticators: [
        'OpenZeppelinAuthenticator',
        'OpenZeppelinAuthenticatorSignatureV4'
      ],
      quorumType: 'for_only',
      verified: true,
      startBlock: 38475089
    }
  },
  arb1: {
    'Arbitrum Treasury': {
      name: 'Arbitrum Treasury',
      about: 'Powering the programmable economy',
      avatar: 'ipfs://QmWZ5SMRfvcK8tycsDqojQaSiKedgtVkS7CkZdxPgeCVsZ',
      externalUrl: 'https://arbitrum.io',
      github: 'OffchainLabs',
      twitter: 'arbitrum',
      address: '0x789fC99093B09aD01C34DC7251D0C89ce743e5a4',
      authenticators: [
        'OpenZeppelinAuthenticator',
        'OpenZeppelinAuthenticatorSignatureV4'
      ],
      verified: true,
      startBlock: 70398215
    },
    'Arbitrum Core': {
      name: 'Arbitrum Core',
      about: 'Powering the programmable economy',
      avatar: 'ipfs://QmWZ5SMRfvcK8tycsDqojQaSiKedgtVkS7CkZdxPgeCVsZ',
      externalUrl: 'https://arbitrum.io',
      github: 'OffchainLabs',
      twitter: 'arbitrum',
      address: '0xf07DeD9dC292157749B6Fd268E37DF6EA38395B9',
      authenticators: [
        'OpenZeppelinAuthenticator',
        'OpenZeppelinAuthenticatorSignatureV4'
      ],
      verified: true,
      startBlock: 70398215
    },
    /*
    GMX: {
      name: 'GMX',
      about:
        'On-chain perpetual & spot dex: BTC, ETH, SOL and many other top crypto assets available with up to 100x leverage directly from your own wallet',
      avatar:
        'ipfs://bafkreidi2f72ct7y5y32hgjwblnfpul4fsac7o5av665o2ydm6th27unc4',
      externalUrl: 'https://gmx.io',
      github: 'gmx-io',
      twitter: 'GMX_IO',
      discord: 'H5PeQru3Aa',
      address: '0x03e8f708e9C85EDCEaa6AD7Cd06824CeB82A7E68',
      authenticators: [
        'OpenZeppelinAuthenticator',
        'OpenZeppelinAuthenticatorSignatureV4'
      ],
      quorumType: 'for_only',
      verified: true,
      startBlock: 204249812
    }
    */
    'UXD Arbitrum One Council': {
      name: 'UXD Arbitrum One Council',
      about: 'UXD council governance on Arbitrum',
      address: '0x8dEc1460C23767e17557f163d8Fe39AF37A244Bb',
      authenticators: [
        'OpenZeppelinAuthenticator',
        'OpenZeppelinAuthenticatorSignatureV4'
      ],
      startBlock: 63981259
    },
    'Cora Protocol DAO': {
      name: 'Cora Protocol DAO',
      about: 'This is the wei !',
      address: '0xE926F8c54b1401600D6A40aBb598b762f4904b6e',
      authenticators: [
        'OpenZeppelinAuthenticator',
        'OpenZeppelinAuthenticatorSignatureV4'
      ],
      startBlock: 110809482
    },
    'SWEEPR Governor': {
      name: 'SWEEPR Governor',
      about: 'Vote on changes to Sweep Protocol',
      avatar:
        'ipfs://bafkreiajv2kskfgxqujhaqlqmmttrabccdiqz5b5wjurfhcdba3y6zhiei',
      twitter: 'SweeprFi',
      discord: 'dnJ7MMgQWH',
      address: '0xC0507cFC6A9E65894C05C1c5b193C7B58b36791f',
      authenticators: [
        'OpenZeppelinAuthenticator',
        'OpenZeppelinAuthenticatorSignatureV4'
      ],
      startBlock: 123624789
    },
    'Open Dollar': {
      name: 'Open Dollar',
      about:
        'Borrow against Liquid Staking Tokens & Arbitrum native assets with our flexible and transparently over-collateralized stablecoin',
      avatar:
        'ipfs://bafkreihcs2wnniokoq3zfxl6gtpodsoyciioyl2cbzydnppnfr26zdc3mu',
      externalUrl: 'https://opendollar.com',
      twitter: 'open_dollar',
      address: '0xf704735CE81165261156b41D33AB18a08803B86F',
      authenticators: [
        'OpenZeppelinAuthenticator',
        'OpenZeppelinAuthenticatorSignatureV4'
      ],
      quorumType: 'for_only',
      startBlock: 203368566
    },
    'BTCMobick DAO': {
      name: 'BTCMobick DAO',
      about: 'We propose and vote for BTCMobick Community',
      address: '0x92409873d5ce3dF0f8a6bA6bDa195A2c5F80ba6F',
      authenticators: [
        'OpenZeppelinAuthenticator',
        'OpenZeppelinAuthenticatorSignatureV4'
      ],
      startBlock: 334063779
    },
    'Lendefi DAO': {
      name: 'Lendefi DAO',
      about: 'Making DeFi Lending Great Again!',
      avatar:
        'ipfs://bafkreielxmsodfqif43crigddhqkvhtclah4vx4fakgpc6hqtftmr3nmca',
      externalUrl: 'https://lendefi.org',
      twitter: 'LendefiDAO',
      address: '0xB094C6ed74A83405A700d235496557bAFDEF2551',
      authenticators: [
        'OpenZeppelinAuthenticator',
        'OpenZeppelinAuthenticatorSignatureV5'
      ],
      startBlock: 355972367
    }
  },
  sep: {
    Sekhmet: {
      name: 'Sekhmet',
      address: '0xB314FAC800bD0F5646e1a230b212Ed88936648e0',
      verified: true,
      startBlock: 9187848,
      authenticators: [
        'OpenZeppelinAuthenticator',
        'OpenZeppelinAuthenticatorSignatureV5'
      ]
    }
  }
};
