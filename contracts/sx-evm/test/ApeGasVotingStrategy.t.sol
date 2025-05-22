// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import { Test } from "forge-std/Test.sol";
import { ApeGasVotingStrategy } from "../src/voting-strategies/ApeGasVotingStrategy.sol";
import { VotingTrieParameters, PackedTrieNode } from "../src/voting-strategies/ApeGasVotingStrategy.sol";

contract ApeGasVotingStrategyTest is Test {
    ApeGasVotingStrategy public apeGasVotingStrategy;
    PackedTrieNode[] public nodes;
    string public FORK_URL = "https://rpc.curtis.apechain.com"; // Test data would probably be taken from curtis
    uint256 public forkId;
    address public herodotusContract = 0x000000000000000000000000000000000000bEEF; // TODO set the correct address
    address public delegateRegistry = 0x000000000000000000000000000000000000bEEF; // TODO set the correct address
    address public satellite = 0x000000000000000000000000000000000000bEEF; // TODO set the correct address

    function setUp() public {
        apeGasVotingStrategy = new ApeGasVotingStrategy();
        forkId = vm.createFork(FORK_URL); // Test data would probably be taken from curtis
        vm.selectFork(forkId); // Test data would probably be taken from curtis
    }

    function testGetVotingPower1() public {
        address voter = 0xfEDE39f346C1c65d07F2FA476d5f4727A0d7dC43;
        uint32 l1BlockNumber = 17399780; // TODO: set appropriate seoplia block number
        uint256 l1ChainId = 11155111; // SEPOLIA
        uint256 l3ChainId = 33111; // CURTIS
        uint256 id = 0x1; // TODO: set appropriate id (corresponding to the delegation ID in the delegate registry)
        bytes memory params = abi.encode(l1ChainId, l3ChainId, herodotusContract, satellite, id, delegateRegistry);

        // TODO: set proof to the correct value
        bytes memory accountProof = bytes.concat(
            hex"f90b08b90214f90211a0340dee4db579b33a6543b006ce7eeedfafcc37c4",
            hex"9536e6ee1de3248f07353608a02967e5718b7badad667242b8f795a31bb3",
            hex"8195b3671a6aeb96c6879d1f79d46ca09252f6e3b753b709e624029f2126",
            hex"831dc0f4afe09c921a57d822d63449c82549a04158faca3e4a6046945344",
            hex"d8232e6a51948cbf55516326b87397b2e88d92c979a0af4b119689c74102",
            hex"abb287b5ee5212dc90ebfcd6fa9413c3eb7913ec40b20915a017c80dfbf2",
            hex"6c007ea7087506724c255c4a96803ec1a109e6e1662e528799a771a0deb2",
            hex"4ee389b3f77cfc8a5c470510077be3df19fdc9627bf00fd88022ffb277de",
            hex"a0309bf8cd5b7186aac2f73b2073512e36614b20dcc4d283cce9fe9252a8",
            hex"fd3694a01e6a0459174499c5b767ac32ef4eb35a982530031131a228fdc0",
            hex"83d0a98d8fb3a0b81be524575b8099629cd00acabaf09f2b6f155c4ce678",
            hex"0a13d76b3724818f1fa0c7d7bf7c85f453d1b3495c39ad77dc7e7ee473e9",
            hex"ab62f1ebb3ba4e61178f3172a01a9da48f1603c5f90a87ed4c127cd6a6a3",
            hex"baa7376409c0753401717817b5fc9da0e16ac29ee18602566bf7a4c3b542",
            hex"f1a3557ffadbf0c194a6df27596d10cd8938a0ae8b29a0e275a2b5a473fa",
            hex"12c5afdeb12d7ebc8cda30a4a4dee973a8bbbc7d30a006ced3c015df743e",
            hex"82a480733ac858b31492d0339fc29719d7e3740762dc402fa0975dcd745a",
            hex"4d9fda86c96a1f214c725c632ecd2a8f0de07f49b5feb119de657e80b902",
            hex"14f90211a05f54df883c446d350a7064d71dc638c7959abb95117dee8e49",
            hex"5d2eaba646f83ba0675559d3e684885ca04118647af84d2ea0367d78d954",
            hex"21f54e42382f5a3d325da0d1f3387eb516adde47c91695f39ae6dbb95551",
            hex"b7b899d11414e9233b89036dfda0ba726a23bd990730606c439038773edb",
            hex"ad9f3b3b8a199b431f05586c973a8e3fa0bd3017f97c8098c65901ff952c",
            hex"eb584e261c52f71436ec603832a9450091186fa02e23a1cfa353becda275",
            hex"a80c99510d5d86b134ef67928b64e7b5502aff519116a07fc3b5340f8358",
            hex"4db91ef1fca9cd65378ae0fac9c4d1c17de8b524f76f717360a0f8ff7f0f",
            hex"918215422bf3a41bb881f78ee6077bae7515f91e096fee090ecca32ba072",
            hex"9ebe4462967ed56a79f5d7e711a77e072d0459cdee94560e70a66e0623c9",
            hex"b3a070afbc5b9491299f2ab02f29e2c8a038dc82e9f860ec213acef73ff0",
            hex"62a426b5a03516d553a5d596c2fb52a91e6fd08a1f5f6a3019db655400ab",
            hex"7edf2c9f28ef4ca0a1273faf4b9512510c57578469a860723662ffea67c3",
            hex"5247b3a62ea0a29548d6a0033db878d86bce5f29a99e407728af174954dc",
            hex"ce2bbe261f760e5717adeff4cba001f87bc7beec726c254940c715ae33d9",
            hex"74182084c22704c30becb82bcb8a9e11a0eed8cd498886147389684f7c76",
            hex"42192fb7fe4fcd104b3786a54d5cab02017f04a04aa745ff2071a6ca9526",
            hex"313fb351b4fe3ccdede45be5e9c9adea19079bad83cf80b90214f90211a0",
            hex"53a8bd49444541ce5d0c5c36e3021c9aaf36749212f20191ae8ed6940b88",
            hex"b3ffa096b046d6685c52a90b85bb974acf70dc3625ee320e4f12271b9fca",
            hex"c4d7bcefa6a0d9a9fc638b3637850dc3289d852627800a5434ab9fed1f6e",
            hex"b6880e777ef92871a04e4681b8bfd0acfe2734a51993f359ea6d460df2a4",
            hex"b422833049577c4d1f0e30a05a4ce4b21a16443726d4b12224eed68659b1",
            hex"0ac166da315b30dfb26079c1be5fa0e9c2b844f13da9c9e95ef7c4c821c9",
            hex"55bd1b771f04eea196f3252e57923b5092a0cff33eaf3967febccd6d1309",
            hex"0ca14fec951915b1cebad5598c92591f7ebf1575a0084b0e2cbd5d5861b8",
            hex"485dad0e0db2e4f79931151ee8203993435c0f4a758637a0689a12afd57b",
            hex"d9202fdbf0c56772d6b3bc9cd36de46f73848cab23ab03d6c1d8a07d6999",
            hex"7a4a397bd9a8fbf9cd617a430c4cab49603d875236f23f65453dc13c99a0",
            hex"21497e24ee5468c84e12dd9b603057890863df39bee1e18f48dad5fdabb5",
            hex"6540a000c74606922e20b024505bc536996b1b18f34339efec3bdfb32f12",
            hex"42775ff124a06ba72f22d6c66887e83dec933bcf02e822f4f28faba71a8a",
            hex"c75b7ef286103a83a0ea33ac847d820f07a5c5adeef70de89f0bbbdf2670",
            hex"c6ad32977d5653f55885d2a027d31426c3079ff3d7d3415350602450a978",
            hex"4c5a2df42d4f03139a69d5341afea01f1b3453d097dee8954da015480fc3",
            hex"bb3896f37a77d04dfc9c8d096a923994bf80b90214f90211a080eed86bdc",
            hex"61bd310d1429513e8e6a942439f94950dd272effcf4aba9b2b2b0fa06817",
            hex"dadd77a3510a1bb4205983d9a5684903698bc1438a805cf8b230d65f30ad",
            hex"a04b9f49f137bff54a38c02abc40283ca690d5883375a254e018f60e708c",
            hex"56f9b6a0457e79cdceac5d1b583136b8f43a7d8384e7f94f3a7c2da9395a",
            hex"78ed8cf65bd3a059144ba6510a94426b6456becd65ebea2111c781c8325c",
            hex"410da1bb8096748c21a017a16f92e95a38dac32491691dffedf3b2e15adc",
            hex"496487f596041b12cdda5568a0666673433ec0601fd86549fd2056acc17b",
            hex"ac31589e14822633c3e2562f6879c1a060da9a86217103c9427120b88000",
            hex"ab6d0ba5fa103b7da88206ff4092a88fac49a0db389335dc5d87dd071e09",
            hex"e147d838678346db3e10fb2ab19bbeab6cc31b2272a0132840899bc5fba1",
            hex"5f3e07d7765a0cc63e2f36b2c38f7badcc0ddb5384d0a70da035dcd54b62",
            hex"305e342b3d00a14a5ddb7d7162ca5efbc9cdda40389fe9454d1896a0e3ab",
            hex"78eeac5ff171c07818163d4cef51094f16652938179059f935cf6d7273a2",
            hex"a050a874276bb0b837d12eb3bf495d14b6c9323cdcb695ed6206865a5474",
            hex"c1b9eba02a1d74692ce045455c89cf53ad310f9962a6ddd4576f85b18bd4",
            hex"9c86e900adfaa03eac9c4b671917e9d79af63cc8eb25cd47a22d77bc3465",
            hex"76de1c57ae4519f059a0003705370c262e2639d8640f2688a81c2e2b6c4f",
            hex"542caa7f0c8bdf1cc32fb1f180b90214f90211a065d0bfe023048a3a7bf8",
            hex"ea87b7cc471a73dcc004a6ca063c77dff084b08309fca07e00f10433dce9",
            hex"f9abac2f32957d37164a80e379bd3233e557d118b445001064a0dd680a3b",
            hex"01a41d4b60f7a280f0f0cdb91d129ab3c35399f75cf1bf71ac349d25a04e",
            hex"e78ba78d98a7c1bd7d22213de3a6db88d8506cc2039cfa109d538fcf53ed",
            hex"c5a0d76e11d74304cf92457ae585c92e565927206f09bc4b884090137a71",
            hex"f0ab364aa0b1f6b39bd29470853122c28726d407779b955ec0d433168836",
            hex"6becf4b4e87a90a0725e3f5b5e28c1160d8768f5362fd4aa3416fa6cd80e",
            hex"4d17d4cb899621c987a2a0e40db4a1e75fab0177fcbba2cb88c3b4ffdf6e",
            hex"eb2d086cf6baed95a83cfad644a077d1dc7b551f5c70ef666acca9790511",
            hex"b4d8dd9d915c9dec7b109eaa4f5fc996a025a40552e12b35e4c2ca62528a",
            hex"f5babc7740ce9757ea343b10ff07659afe5379a035c5c741315d1d6637d0",
            hex"61e9b185d521de6952ef82ab46d676cf671e39f15006a0769ee057bd6e08",
            hex"49d75b8934d945ec4dc2c89c678086dea57f65726105107eb7a0988e4b76",
            hex"16585d9454e9ea2d737321bb92b9453674fd8984279992514938c71da049",
            hex"52a08eb68a5f29897e6575c71f087aa6a9c41c72c595dbd522cd131a1344",
            hex"d1a0f5cb69d02157155d72fb915c303d93ecd44eaaf3aecfa7160625e550",
            hex"629e7596a08967100a30f041e7e527177cd2f1bf80c18ca2a5fbfd099cd0",
            hex"8bd0bb7288f8a780b893f89180a060c64a54c5b2726bd20c873327ccc6ed",
            hex"92ab17e41c9d58babff6c67fb7f5819ba01401f7fec12989ab325492f8ab",
            hex"ded716d86a349eaa099ec1980b1feaad88d4d78080808080808080a060a1",
            hex"82ad274fa6b92fdc0060d61178de6bfff4990b5c5256bff71b49bc21ff0b",
            hex"8080a0aac7cf98345139a879303622738e515366ef948bcc7c8e3930635c",
            hex"65883e3eb68080"
        );

        // TODO: fill up `nodes` with appropriate data

        nodes.push(
            PackedTrieNode(
                uint256(uint160(0x41BC7Cb8143f21fa6950fee1d89B770020D78057)),
                uint256(uint160(0x0)),
                uint256(0x800000000000000000000000000000000000000000000000000000000000005b)
            )
        );

        nodes.push(
            PackedTrieNode(
                uint256(uint160(0x883cf49A530ddaE3EbC9B228398bc5E9B4d2Cfb7)),
                uint256(uint160(0x7116f8b4E2315a17ecF6A6F5970e0ddE2D261C0A)),
                uint256(0x0)
            )
        );

        nodes.push(
            PackedTrieNode(
                uint256(uint160(0x26b34a57c9D47FeaA8471bf5D770C38CD81e140F)),
                uint256(uint160(0x394E51C20D68F6662493f34625f415A911a10cCa)),
                uint256(0x0)
            )
        );

        nodes.push(
            PackedTrieNode(
                uint256(uint160(0x8887EEaC9E556FbDF82528a4a9819EF32dE73A9C)),
                uint256(uint160(0x166CAC334B2b3c3808bf4628d42BA7458a9f2687)),
                uint256(0x0)
            )
        );

        nodes.push(
            PackedTrieNode(
                uint256(uint160(0x3DE751b3102deC0C9EBA84cCf03cD579FA6C2ee0)),
                uint256(uint160(0xeeaE81AB4f2BC487c92b312Bba7BcbC9E3Fa6B00)),
                uint256(0x0)
            )
        );

        nodes.push(
            PackedTrieNode(
                uint256(uint160(0x707B65f2a5B69A8a284f38eFBD043aa692e389a2)),
                uint256(uint160(0xe2Ec2fA91Ba888C05B9262d560e5Ca763Dfe59e8)),
                uint256(0x0)
            )
        );

        nodes.push(
            PackedTrieNode(
                uint256(uint160(0x36EE32cd6e7207C023c502c6432d27D7f0cC740D)),
                uint256(uint160(0x79fC9e632Dc3a0CEdBAfb997C7E7b2873c8B6B0B)),
                uint256(0x0)
            )
        );

        nodes.push(
            PackedTrieNode(
                uint256(uint160(0xFf9D4dE60193d0737edeA76321cc259C4577b2e9)),
                uint256(uint160(0x02DE39f346C1C65D07f2fA476D5F4727a0D7DC43)),
                uint256(0x800000000000000000000000000000000000000000000000000000000000009a)
            )
        );

        // TODO: Set these parameters accordingly
        VotingTrieParameters memory votingTrieParameters = VotingTrieParameters({
            accountProof: accountProof,
            account: voter,
            committmentHasDelegated: false,
            committmentVotingPower: 0x12b2040c8b03190485c7,
            nodes: nodes
        });
        bytes memory userParams = abi.encode(votingTrieParameters);

        uint256 votingPower = apeGasVotingStrategy.getVotingPower(l1BlockNumber, voter, params, userParams);

        assertEq(votingPower, 0x12b2040c8b03190485c7); // TODO: update VP value here
    }
}
