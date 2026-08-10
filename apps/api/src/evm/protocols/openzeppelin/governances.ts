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
      startBlock: 13248552
    },
    'Babylon Finance': {
      name: 'Babylon Finance',
      about: 'Community-led Asset Management.',
      avatar:
        'ipfs://bafkreianvonos4zcp65rukbis6qi2yrubrmg4inwixuetcye63vcgseyoq',
      address: '0xBEC3de5b14902C660Bd2C7EfD2F259998424cc24',
      authenticators: [
        'OpenZeppelinAuthenticator',
        'OpenZeppelinAuthenticatorSignatureV4'
      ],
      quorumType: 'for_only',
      startBlock: 13378903
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
      startBlock: 13494336
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
      startBlock: 13980216
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
      startBlock: 14110193
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
      startBlock: 14345191
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
      startBlock: 14592633
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
      startBlock: 14817901
    },
    TrueFi: {
      name: 'TrueFi',
      about:
        'TrueFi brings collateral-free lending on-chain, maximizing capital efficiency for borrowers and earning rates for lenders.',
      avatar:
        'ipfs://bafkreibwht4huglefxwb5ivoro3w2vr2ugln6v2q56gci74hgsnjkiswya',
      twitter: 'TrueFiDAO',
      discord: '3tMyMqyqDj',
      address: '0x585CcA060422ef1779Fb0Dd710A49e7C49A823C9',
      authenticators: [
        'OpenZeppelinAuthenticator',
        'OpenZeppelinAuthenticatorSignatureV4'
      ],
      startBlock: 14915723
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
      startBlock: 14924507
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
      startBlock: 14931927
    },
    'Threshold Network': {
      name: 'Threshold Network',
      about: 'Threshold powers user sovereignty on the public blockchain.',
      avatar:
        'ipfs://bafkreihmy2zmac5b2wqqkf7c6fjldozpx5w4aqe5hmlmhcb2qhdjq7lnce',
      address: '0xd101f2B25bCBF992BdF55dB67c104FE7646F5447',
      authenticators: [
        'OpenZeppelinAuthenticator',
        'OpenZeppelinAuthenticatorSignatureV4'
      ],
      startBlock: 14979545
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
      startBlock: 15670864
    },
    'Rari DAO (v1)': {
      name: 'Rari DAO (v1)',
      about:
        'Rari DAO governs the $RARI ecosystem: Rarible protocol and RARI chain. We are on a mission to fuel NFT mass adoption by building decentralized infrastructure and powering innovative NFT use cases.',
      avatar:
        'ipfs://bafkreibsjnecjysvngttimbzjpobq2ajlwx7tc53xq63qjyg56e2ce3jm4',
      externalUrl: 'https://rari.foundation/',
      twitter: 'rarifoundation',
      discord: 'rarifoundation',
      address: '0x6552C8fb228f7776Fc0e4056AA217c139D4baDa1',
      authenticators: [
        'OpenZeppelinAuthenticator',
        'OpenZeppelinAuthenticatorSignatureV4'
      ],
      quorumType: 'for_only',
      startBlock: 15741138
    },
    EthernaLotto: {
      name: 'EthernaLotto',
      about: 'An autonomous decentralized lottery game based on Ethereum!',
      avatar:
        'ipfs://bafkreigtlkxi6otq6xkb7lu3inm3a3n7wdifvk432abpngusjeofxd7yey',
      address: '0x7F5CA8e9664D66Fc7c11d26C7D9B750988d5c8a7',
      authenticators: [
        'OpenZeppelinAuthenticator',
        'OpenZeppelinAuthenticatorSignatureV4'
      ],
      startBlock: 16085285
    },
    BIGCAP: {
      name: 'BIGCAP',
      about: 'The BIGCAP Community Decentralized Autonomous Organization',
      avatar:
        'ipfs://bafkreigtu4cusaujffp62khx37rc5ab35o3h6gd5k6yju3j4j4ja2qdow4',
      twitter: 'bigcapproject',
      address: '0x442660DDf67dd90f9a75885b2e2312F991b3027B',
      authenticators: [
        'OpenZeppelinAuthenticator',
        'OpenZeppelinAuthenticatorSignatureV4'
      ],
      startBlock: 16179548
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
      startBlock: 16490162
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
      startBlock: 16687914
    },
    'Joseon Gov DAO': {
      name: 'Joseon Gov DAO',
      about: 'Joseon DAO for managing government assets',
      address: '0xda1E0AC7629dF4A8c6ad9Afd43Bed5AB1d9ed303',
      authenticators: [
        'OpenZeppelinAuthenticator',
        'OpenZeppelinAuthenticatorSignatureV4'
      ],
      startBlock: 17011171
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
      startBlock: 17128364
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
      startBlock: 17149954
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
      startBlock: 17246677
    },
    SoftDAO: {
      name: 'SoftDAO',
      about:
        'The SoftDAO supports the development of high-integrity protocols. Rebel Reasonably. Trust Code. Build. Do It Right.',
      avatar:
        'ipfs://bafkreihgzwanr2wgdk4gvlttqsdekaxdhjesxioi4dzapiz567tx3vkvmi',
      twitter: 'thesoftdao',
      address: '0x0ADd6d42bBfe6c40e15B02A2C8A1b81B36a2B326',
      authenticators: [
        'OpenZeppelinAuthenticator',
        'OpenZeppelinAuthenticatorSignatureV4'
      ],
      startBlock: 17630908
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
      startBlock: 17679972
    },
    'Olas (prev. Autonolas)': {
      name: 'Olas (prev. Autonolas)',
      address: '0x8E84B5055492901988B831817e4Ace5275A3b401',
      authenticators: [
        'OpenZeppelinAuthenticator',
        'OpenZeppelinAuthenticatorSignatureV4'
      ],
      quorumType: 'for_only',
      startBlock: 17684345
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
      startBlock: 17687649
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
      startBlock: 17814193
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
      startBlock: 17859049
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
      startBlock: 17874412
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
      startBlock: 17879540
    },
    AMKT: {
      name: 'AMKT',
      about: 'AMKT Governance',
      address: '0xb6a6f2a56693Dc4f893f8396D945f7dFe03aA9ba',
      authenticators: [
        'OpenZeppelinAuthenticator',
        'OpenZeppelinAuthenticatorSignatureV4'
      ],
      startBlock: 18471044
    },
    'Vesper DAO': {
      name: 'Vesper DAO',
      about: 'Vesper DAO',
      address: '0x0F1CF46c224b1aDe0e263D51109dac1eC645d8eF',
      authenticators: [
        'OpenZeppelinAuthenticator',
        'OpenZeppelinAuthenticatorSignatureV4'
      ],
      startBlock: 18471475
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
      startBlock: 18728947
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
      startBlock: 19399472
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
      startBlock: 19447876
    },
    Fluence: {
      name: 'Fluence',
      about: 'Cloudless computing platform for the future of the web',
      avatar:
        'ipfs://bafkreihtn7n5jdymbao32s42zlxwwxmtc7vstmbbt733apekj2qhzm664i',
      externalUrl: 'https://fluence.network',
      twitter: 'fluence_project',
      address: '0x674299Cc65CEFAac9057f7EB307f5f6bB861f8E0',
      authenticators: [
        'OpenZeppelinAuthenticator',
        'OpenZeppelinAuthenticatorSignatureV5'
      ],
      startBlock: 19484536
    },
    KarratCo: {
      name: 'KarratCo',
      about:
        'The official Governance Tally for the KarratCoin DAO. Committed to building and supporting a vibrant gaming, entertainment, and AI ecosystem for developers.',
      avatar:
        'ipfs://bafkreiczi2levmtnpsiuv6mkm7yjb6y2vjofpszepmhn7ly4sz23phmhtu',
      externalUrl: 'https://www.karratcoin.com/',
      twitter: 'karratcoin',
      address: '0xBaccc25ad3C77898E7563c6C98ea1B5CAD910615',
      authenticators: [
        'OpenZeppelinAuthenticator',
        'OpenZeppelinAuthenticatorSignatureV5'
      ],
      startBlock: 19712370
    },
    Anvil: {
      name: 'Anvil',
      about:
        'Anvil is a system of Ethereum-based smart contracts that manages collateral and issues fully secured credit.',
      avatar:
        'ipfs://bafkreicqektvg6rst5trpipq5sxiqpxv46ahsjg3fjv3sn2d4p4juftvsq',
      externalUrl: 'https://anvil.xyz',
      twitter: 'anvil_xyz',
      address: '0x00e83d0698FAf01BD080A4Dd2927e6aB7C4874c9',
      authenticators: [
        'OpenZeppelinAuthenticator',
        'OpenZeppelinAuthenticatorSignatureV5'
      ],
      startBlock: 20735345
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
      startBlock: 20751377
    },
    Zivoe: {
      name: 'Zivoe',
      about:
        'Zivoe is a Real World Asset protocol built to disrupt the high-interest consumer lending market. We help victims of predatory, high-interest loans refinance their debts and improve their financial health.',
      address: '0x94Ac60103B6b0df0cd828086B16EfF2A3e32a71e',
      authenticators: [
        'OpenZeppelinAuthenticator',
        'OpenZeppelinAuthenticatorSignatureV4'
      ],
      startBlock: 20820581
    },
    'Lendefi DAO [Base Mainnet]': {
      name: 'Lendefi DAO [Base Mainnet]',
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
      startBlock: 22654046
    },
    'DPCE DAO': {
      name: 'DPCE DAO',
      about: 'DPCE DAO',
      address: '0x49034c6AA7a0C42b28D4074C13298c711c2AfC2A',
      authenticators: [
        'OpenZeppelinAuthenticator',
        'OpenZeppelinAuthenticatorSignatureV5'
      ],
      startBlock: 22952316
    },
    'PEACE COIN PROTOCOL DAO': {
      name: 'PEACE COIN PROTOCOL DAO',
      about: 'PEACE COIN PROTOCOL DAO',
      address: '0x00831a36ce3535EFFeFe54BaD0bb8dE27687a237',
      authenticators: [
        'OpenZeppelinAuthenticator',
        'OpenZeppelinAuthenticatorSignatureV5'
      ],
      startBlock: 23345757
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
      startBlock: 23676984
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
      startBlock: 24353688
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
      startBlock: 24549378
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
    MyToken: {
      name: 'MyToken',
      about: 'Test MyToken',
      address: '0x008D55C27E608A6F661Eca742507e33dC856123d',
      authenticators: [
        'OpenZeppelinAuthenticator',
        'OpenZeppelinAuthenticatorSignatureV4'
      ],
      quorumType: 'for_only',
      startBlock: 34141146
    },
    'local-test': {
      name: 'local-test',
      about: 'Just for local test',
      address: '0x7a532af21D7AE926c3c163213374B7C0B874FdA2',
      authenticators: [
        'OpenZeppelinAuthenticator',
        'OpenZeppelinAuthenticatorSignatureV4'
      ],
      quorumType: 'for_only',
      startBlock: 34450804
    },
    DAOFranTest: {
      name: 'DAOFranTest',
      about: 'This is just a test',
      address: '0x08fB5B209b2e25724378Ecf8d3f6686F248717C7',
      authenticators: [
        'OpenZeppelinAuthenticator',
        'OpenZeppelinAuthenticatorSignatureV5'
      ],
      startBlock: 45130743
    },
    'Lendefi DAO [Base Mainnet]': {
      name: 'Lendefi DAO [Base Mainnet]',
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
      startBlock: 56209954
    },
    testYesDAO: {
      name: 'testYesDAO',
      about:
        '去中心化比特币矿场投资DAO，通过智能合约实现透明的资金管理和收益分配.测试环境',
      address: '0xAF9a478F61EaF0eDC6EF8676da47A47d74CDAbAC',
      authenticators: [
        'OpenZeppelinAuthenticator',
        'OpenZeppelinAuthenticatorSignatureV4'
      ],
      startBlock: 59038303
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
        'OpenZeppelinAuthenticatorSignatureV5'
      ],
      quorumType: 'for_only',
      verified: true,
      startBlock: 204249812
    }
    */ 'SWEEP Test Governance': {
      name: 'SWEEP Test Governance',
      about:
        'SWEEP TEST helps to set SWEEP TEST parameters and manage the treasury',
      address: '0x50091D36E8904a222dFa84a23812451a169A3b0f',
      authenticators: [
        'OpenZeppelinAuthenticator',
        'OpenZeppelinAuthenticatorSignatureV4'
      ],
      startBlock: 65506023
    },
    'SWEEP TEST GOVERNANCE': {
      name: 'SWEEP TEST GOVERNANCE',
      about:
        'SWEEP TEST helps to set SWEEP TEST parameters and manage the treasury.',
      avatar:
        'ipfs://bafkreih3mzjhl3zju4eq22hmnbynqwled6uika6bjwlxfaahavyx4iomjq',
      address: '0xD013237b30e5Bcd8924b85aCA7b2254DF06D5B92',
      authenticators: [
        'OpenZeppelinAuthenticator',
        'OpenZeppelinAuthenticatorSignatureV4'
      ],
      startBlock: 65745737
    },
    'UXD Arbitrum One Council': {
      name: 'UXD Arbitrum One Council',
      about: 'UXD council governance on Arbitrum',
      address: '0x8dEc1460C23767e17557f163d8Fe39AF37A244Bb',
      authenticators: [
        'OpenZeppelinAuthenticator',
        'OpenZeppelinAuthenticatorSignatureV4'
      ],
      startBlock: 72362874
    },
    InvestmentDAO: {
      name: 'InvestmentDAO',
      about: 'InvestmentDAO',
      address: '0x727aEBCDF805905bcF80292109dc05eb485330B7',
      authenticators: [
        'OpenZeppelinAuthenticator',
        'OpenZeppelinAuthenticatorSignatureV4'
      ],
      startBlock: 74495008
    },
    'London DAO': {
      name: 'London DAO',
      about: 'London DAO',
      avatar:
        'ipfs://bafkreifxzk3bzt3ktdkiaqp5nzfq7agedw6evo34ftelruvysmxy5kafty',
      address: '0x936139366c5db48543368EE9cD075267d176a02c',
      authenticators: [
        'OpenZeppelinAuthenticator',
        'OpenZeppelinAuthenticatorSignatureV4'
      ],
      startBlock: 74964955
    },
    'Better World DAO': {
      name: 'Better World DAO',
      about: 'This is a DAO with the aim to build a better world.',
      address: '0x3E434c63beFCC629f7FCaAe5c49343767FBecDE2',
      authenticators: [
        'OpenZeppelinAuthenticator',
        'OpenZeppelinAuthenticatorSignatureV4'
      ],
      startBlock: 88617487
    },
    'Cryptoplaza DAO Test': {
      name: 'Cryptoplaza DAO Test',
      about: 'Daotest',
      address: '0xB653767A5f350d7E8De8336A691E5bf317c751c4',
      authenticators: [
        'OpenZeppelinAuthenticator',
        'OpenZeppelinAuthenticatorSignatureV4'
      ],
      startBlock: 90268803
    },
    'Lisbon DAO': {
      name: 'Lisbon DAO',
      about: 'Lisbon DAO',
      address: '0x5a0a838902c62337cE15B788271D7fc553E449A1',
      authenticators: [
        'OpenZeppelinAuthenticator',
        'OpenZeppelinAuthenticatorSignatureV4'
      ],
      startBlock: 90406508
    },
    'Lisbon DAO2': {
      name: 'Lisbon DAO2',
      about: 'Lisbon DAO2',
      address: '0xEdDcdcf0A46fd63a3E127eA7EC193A78F94C60d3',
      authenticators: [
        'OpenZeppelinAuthenticator',
        'OpenZeppelinAuthenticatorSignatureV4'
      ],
      startBlock: 90506653
    },
    'AS Dao': {
      name: 'AS Dao',
      about: 'AS Dao',
      address: '0xd05729adD9346fA72089668E2e2e3BaC0708CFE1',
      authenticators: [
        'OpenZeppelinAuthenticator',
        'OpenZeppelinAuthenticatorSignatureV4'
      ],
      startBlock: 97044177
    },
    'Cora Protocol DAO': {
      name: 'Cora Protocol DAO',
      about: 'This is the wei !',
      address: '0xE926F8c54b1401600D6A40aBb598b762f4904b6e',
      authenticators: [
        'OpenZeppelinAuthenticator',
        'OpenZeppelinAuthenticatorSignatureV4'
      ],
      startBlock: 114748176
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
      startBlock: 129261207
    },
    'Good Entry': {
      name: 'Good Entry',
      about:
        'The mission of the governor is to promote more community driven consensus as the project matures on core topics that lead to growth',
      avatar:
        'ipfs://bafybeid7zje5zylyfcthij73aoj75pguzaonnqj2sj37phwclbctd2yxvq',
      externalUrl: 'https://www.goodentry.io/',
      twitter: 'goodentrylabs',
      discord: 'https://discord.com/https://discord.com/invite/goodentry',
      address: '0xDea8f5634970557DC7938d07a1944bC33a4528a3',
      authenticators: [
        'OpenZeppelinAuthenticator',
        'OpenZeppelinAuthenticatorSignatureV4'
      ],
      quorumType: 'for_only',
      startBlock: 171704991
    },
    'Super ARB DAO': {
      name: 'Super ARB DAO',
      about: 'Test DAO on Arbitrum One',
      address: '0xF1EF03e8B63BEaf68eDEAA3a72781BB2D3b2A571',
      authenticators: [
        'OpenZeppelinAuthenticator',
        'OpenZeppelinAuthenticatorSignatureV5'
      ],
      startBlock: 185351067
    },
    'Credit Guild Onboard Governor': {
      name: 'Credit Guild Onboard Governor',
      about: 'This is a subsidiary Governor for onboarding new lending terms.',
      address: '0x3424f7560562468Fd4F7cD268dF7998090B4Ab21',
      authenticators: [
        'OpenZeppelinAuthenticator',
        'OpenZeppelinAuthenticatorSignatureV4'
      ],
      startBlock: 203544059
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
      startBlock: 203643381
    },
    'Credit Guild': {
      name: 'Credit Guild',
      about:
        'The Credit Guild is the first oracle free lending pool. This is the main Governor for the Arbitrum deployment.',
      externalUrl: 'https://www.creditguild.org',
      twitter: 'creditguild',
      address: '0x5a2568b31532d9B6DB228570F75B4c83f2201951',
      authenticators: [
        'OpenZeppelinAuthenticator',
        'OpenZeppelinAuthenticatorSignatureV4'
      ],
      startBlock: 203777168
    },
    'Credit Guild Params Governor': {
      name: 'Credit Guild Params Governor',
      about:
        'This is a subsidiary Governor for updating parameters of lending terms.',
      address: '0x45AF76adA2158B3914A2B6A901e2B85c44E0f27f',
      authenticators: [
        'OpenZeppelinAuthenticator',
        'OpenZeppelinAuthenticatorSignatureV4'
      ],
      startBlock: 242130667
    },
    'BTCMobick DAO': {
      name: 'BTCMobick DAO',
      about: 'We propose and vote for BTCMobick Community',
      address: '0x92409873d5ce3dF0f8a6bA6bDa195A2c5F80ba6F',
      authenticators: [
        'OpenZeppelinAuthenticator',
        'OpenZeppelinAuthenticatorSignatureV4'
      ],
      startBlock: 334081040
    },
    'BTCMobick DAO v1.0': {
      name: 'BTCMobick DAO v1.0',
      about: 'Released 2025-05-15',
      address: '0xa2c5831fc99265A22E5Aaf5c562435732E3Ff591',
      authenticators: [
        'OpenZeppelinAuthenticator',
        'OpenZeppelinAuthenticatorSignatureV4'
      ],
      startBlock: 337192915
    },
    'Lendefi DAO [Base Mainnet]': {
      name: 'Lendefi DAO [Base Mainnet]',
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
      startBlock: 364277386
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
