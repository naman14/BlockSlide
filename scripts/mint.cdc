import FlowPuzzleNFT from 0xf8d6e0586b0a20c7
import NonFungibleToken from 0xf8d6e0586b0a20c7
import MetadataViews from 0xf8d6e0586b0a20c7

transaction(){
    let recipientCollection: &FlowPuzzleNFT.Collection{NonFungibleToken.CollectionPublic}

    prepare(signer: AuthAccount){

        if signer.borrow<&FlowPuzzleNFT.Collection>(from: FlowPuzzleNFT.CollectionStoragePath) == nil {
        signer.save(<- FlowPuzzleNFT.createEmptyCollection(), to: FlowPuzzleNFT.CollectionStoragePath)
        signer.link<&FlowPuzzleNFT.Collection{NonFungibleToken.CollectionPublic, MetadataViews.ResolverCollection}>(FlowPuzzleNFT.CollectionPublicPath, target: FlowPuzzleNFT.CollectionStoragePath)
        }

        self.recipientCollection = signer.getCapability(FlowPuzzleNFT.CollectionPublicPath)
                            .borrow<&FlowPuzzleNFT.Collection{NonFungibleToken.CollectionPublic}>()!
    }

    execute{
        FlowPuzzleNFT.verifyAndMintNFT(recipient: self.recipientCollection, moves: [1,6,7,1,8,9,2,5,0,6,6,0,2,6,6,8], shuffleIterationCount: 2)
    }
}