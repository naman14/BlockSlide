
import * as fcl from "@onflow/fcl"

export const CONTRACT_ADDRESS = "0x1b25a8536e63a7da";
export const NFT_CONTRACT_ADDRESS = "0x631e88ae7f1d7c20"; // testnet NonFungibeleToken contract address

const DEBUG = false

export const setupFLow = () => {
    fcl.config({
        "discovery.wallet": "https://fcl-discovery.onflow.org/testnet/authn",
        "accessNode.api": "https://testnet.onflow.org",
        // "accessNode.api": "http://localhost:8888",
        "app.detail.icon": "https://namand.in/FlowPuzzle/",
        "app.detail.title": "FlowPuzzle",
        "app.detail.url": "https://namand.in/FlowPuzzle/"
      })

}

export const contractGetTotalMinted = async () => {
    const cadence = `
        import FlowPuzzleNFT from ${CONTRACT_ADDRESS}
        import NonFungibleToken from ${CONTRACT_ADDRESS}
        import MetadataViews from ${CONTRACT_ADDRESS}

        pub fun main(): UInt64 {
            return FlowPuzzleNFT.totalSupply
        }
    `.trim()

    let result = await fcl.query({ cadence })
    console.log('minted count: ' + result)
    return result
}

export const contractIsAvailableForSale = async (tokenId) => {
    const cadence = `
        import FlowPuzzleNFT from ${CONTRACT_ADDRESS}
        import NonFungibleToken from ${CONTRACT_ADDRESS}
        import MetadataViews from ${CONTRACT_ADDRESS}

        pub fun main(): Bool {
            return FlowPuzzleNFT.isAvailableForSale(tokenId: ${tokenId})
        }
    `.trim()

    let result = await fcl.query({ cadence })
    console.log(result)
    return result
}

export const contractGetShuffledOrder = async (tokenId) => {
    const cadence = `
        import FlowPuzzleNFT from ${CONTRACT_ADDRESS}
        import NonFungibleToken from ${CONTRACT_ADDRESS}
        import MetadataViews from ${CONTRACT_ADDRESS}

        pub fun main(): FlowPuzzleNFT.ShuffleInfo {
            let shuffleInfo = FlowPuzzleNFT.getShuffledNumbersForToken(tokenId:${tokenId})
            return shuffleInfo
        }

    `.trim()

    let result = await fcl.query({ cadence })
    result.shuffleIterationCount = parseInt(result.shuffleIterationCount)
    result.shuffledNumbers = result.shuffledNumbers.map((item) => parseInt(item))
    console.log(result)
    return result
}

export const contractGetMovesForToken = async (tokenId) => {
    const cadence = `
        import FlowPuzzleNFT from ${CONTRACT_ADDRESS}
        import NonFungibleToken from ${CONTRACT_ADDRESS}
        import MetadataViews from ${CONTRACT_ADDRESS}

        pub fun main(): [UInt8] {
            let movesInfo = FlowPuzzleNFT.getMovesForToken(tokenId:${tokenId})
            return movesInfo
        }

    `.trim()

    let result = await fcl.query({ cadence })
    result = result.map((item) => parseInt(item))
    console.log(result)
    return result
}

export const contractMintNFT = async (moves, shuffleInteration) => {
    console.log('chain moves', moves)
    console.log('chain shuffleInteration', shuffleInteration)
    const cadence = `
        import FlowPuzzleNFT from ${CONTRACT_ADDRESS}
        import NonFungibleToken from ${NFT_CONTRACT_ADDRESS}
        import MetadataViews from ${NFT_CONTRACT_ADDRESS}

        transaction(moves: [UInt8], shuffleInteration: UInt16){
            let recipientCollection: &AnyResource{NonFungibleToken.CollectionPublic}

            prepare(signer: AuthAccount){

                if signer.borrow<&AnyResource>(from: FlowPuzzleNFT.CollectionStoragePath) == nil {
                    signer.save(<- FlowPuzzleNFT.createEmptyCollection(), to: FlowPuzzleNFT.CollectionStoragePath)
                    signer.link<&AnyResource{NonFungibleToken.CollectionPublic, MetadataViews.ResolverCollection}>(FlowPuzzleNFT.CollectionPublicPath, target: FlowPuzzleNFT.CollectionStoragePath)
                }

                self.recipientCollection = signer.getCapability(FlowPuzzleNFT.CollectionPublicPath)
                                    .borrow<&AnyResource{NonFungibleToken.CollectionPublic}>()!
            }
        
            execute{
                FlowPuzzleNFT.verifyAndMintNFT(recipient: self.recipientCollection, moves: moves, shuffleIterationCount: shuffleInteration)
            }
        }

    `.trim()
    
    const args = [
        fcl.arg(moves, fcl.t.Array(fcl.t.UInt8)), 
        fcl.arg(shuffleInteration, fcl.t.UInt16)
      ]

      const result = await fcl.mutate({
        cadence: cadence,
        args: (arg, t) => args,
      })

    console.log(result)
    return result
}