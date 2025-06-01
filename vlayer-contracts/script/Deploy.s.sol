// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console2} from "forge-std/Script.sol";
import {SophosVerifier} from "../src/vlayer/SophosVerifier.sol";
import {SophosProver} from "../src/vlayer/SophosProver.sol";

contract DeployScript is Script {
    function setUp() public {}

    function run() public {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIV");
        vm.startBroadcast(deployerPrivateKey);

        SophosProver sophosProver = new SophosProver(); 
        SophosVerifier sophosVerifier = new SophosVerifier(address(sophosProver));
        console2.log("SophosVerifier contract deployed to:", address(sophosVerifier));
    }
}