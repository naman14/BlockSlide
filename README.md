# BlockSlide

BlockSlide is a fully interactive puzzle NFT game built on Flow blockchain

## Fully on chain logic

Contract code at https://github.com/naman14/BlockSlide/blob/main/cadence/FlowPuzzleNFT.cdc

* Contract determines shuffling order for each tokenId

* User solves the puzzle, user’s solution moves are packed in a format that is highly gas efficient

* Mint function is called by user with packed moves

* Contract verifies the moves with the original shuffle order determined by the contract itself.

* Contract saves the packed moves of user for interactive NFT metadata and replay NFT


## Interactive NFT

* Replay of moves user did to solve puzzle

* Score assigned based on moves count compared to least possible moves

* Different borders assigned based on score

* Unique music in each NFT

  
## Interactive music

* Combination of puzzle and solution results in a unique music associated with NFT

* Every user will get unique music based on moves done to solve puzzle

* Hundreds of thousands of unique music possible

## Gas efficient

Since the moves of a user are processed on chain to verify if the puzzle was actually solved, the moves need to be packed in a highly gas efficient way
This logic is present at https://github.com/naman14/BlockSlide/blob/main/src/onchainmoves.js

