// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.21;

import {Proof} from "vlayer-0.1.0/Proof.sol";
import {Verifier} from "vlayer-0.1.0/Verifier.sol";

import {SophosProver} from "./SophosProver.sol";

contract SophosVerifier is Verifier {
    address public prover;

    string public moves;

    constructor(address _prover) {
        prover = _prover;
    }

    function verify(Proof calldata, string memory _moves) public onlyVerified(prover, SophosProver.main.selector) {
        moves = _moves;
    }
}
