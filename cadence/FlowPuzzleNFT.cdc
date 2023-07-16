import NonFungibleToken from "NonFungibleToken"
import MetadataViews from "MetadataViews"
import ViewResolver from "ViewResolver"

pub contract FlowPuzzleNFT: NonFungibleToken, ViewResolver {

    pub var totalSupply: UInt64
    pub var maxTokens: UInt64

    // hold moves data for each token
    pub struct TokenInfo {
        pub var shuffleTokenId: UInt64
        pub var movesData: [UInt8]

        init(shuffleTokenId: UInt64, movesData: [UInt8]) {
            self.shuffleTokenId = shuffleTokenId
            self.movesData = movesData
        }
    }

    pub struct ShuffleInfo {
       pub var shuffledNumbers: [UInt8; 9]
        pub var shuffleIterationCount: UInt16

        init(shuffledNumbers: [UInt8; 9], shuffleIterationCount: UInt16) {
            self.shuffledNumbers = shuffledNumbers
            self.shuffleIterationCount = shuffleIterationCount
        }
    }

    pub var movesCollection: {UInt64: TokenInfo}

    pub event ContractInitialized()
    pub event Withdraw(id: UInt64, from: Address?)
    pub event Deposit(id: UInt64, to: Address?)

    pub let CollectionStoragePath: StoragePath
    pub let CollectionPublicPath: PublicPath

    pub var baseUrl: String

    pub resource NFT: NonFungibleToken.INFT, MetadataViews.Resolver {

        pub let id: UInt64

        pub let baseUrl: String

        access(self) let metadata: {String: AnyStruct}

        init(
            id: UInt64,
            baseUrl: String,
            metadata: {String: AnyStruct},
        ) {
            self.id = id
            self.baseUrl = baseUrl
            self.metadata = metadata
        }

        pub fun getViews(): [Type] {
            return [
                Type<MetadataViews.Display>(),
                Type<MetadataViews.Editions>(),
                Type<MetadataViews.ExternalURL>(),
                Type<MetadataViews.NFTCollectionData>(),
                Type<MetadataViews.NFTCollectionDisplay>(),
                Type<MetadataViews.Serial>(),
                Type<MetadataViews.Traits>()
            ]
        }

        pub fun resolveView(_ view: Type): AnyStruct? {
            switch view {
                case Type<MetadataViews.Display>():
                    return MetadataViews.Display(
                        "FlowPuzzle NFT #".concat(self.id.toString()),
                        description: "FlowPuzzle NFT",
                        thumbnail: MetadataViews.HTTPFile(
                            url: self.baseUrl.concat("pfp_").concat(self.id.toString()).concat(".png")
                        )
                    )
                case Type<MetadataViews.Editions>():
                    // There is no max number of NFTs that can be minted from this contract
                    // so the max edition field value is set to nil
                    let editionInfo = MetadataViews.Edition(name: "Flow Puzzle NFT Edition", number: self.id, max: nil)
                    let editionList: [MetadataViews.Edition] = [editionInfo]
                    return MetadataViews.Editions(
                        editionList
                    )
                case Type<MetadataViews.Serial>():
                    return MetadataViews.Serial(
                        self.id
                    )
                case Type<MetadataViews.ExternalURL>():
                    return MetadataViews.ExternalURL(self.baseUrl.concat("?tokenId=").concat(self.id.toString()))
                case Type<MetadataViews.NFTCollectionData>():
                    return MetadataViews.NFTCollectionData(
                        storagePath: FlowPuzzleNFT.CollectionStoragePath,
                        publicPath: FlowPuzzleNFT.CollectionPublicPath,
                        providerPath: /private/flowPuzzleNFTCollection,
                        publicCollection: Type<&FlowPuzzleNFT.Collection{FlowPuzzleNFT.FlowPuzzleNFTCollectionPublic}>(),
                        publicLinkedType: Type<&FlowPuzzleNFT.Collection{FlowPuzzleNFT.FlowPuzzleNFTCollectionPublic,NonFungibleToken.CollectionPublic,NonFungibleToken.Receiver,MetadataViews.ResolverCollection}>(),
                        providerLinkedType: Type<&FlowPuzzleNFT.Collection{FlowPuzzleNFT.FlowPuzzleNFTCollectionPublic,NonFungibleToken.CollectionPublic,NonFungibleToken.Provider,MetadataViews.ResolverCollection}>(),
                        createEmptyCollectionFunction: (fun (): @NonFungibleToken.Collection {
                            return <-FlowPuzzleNFT.createEmptyCollection()
                        })
                    )
                case Type<MetadataViews.NFTCollectionDisplay>():
                    let media = MetadataViews.Media(
                        file: MetadataViews.HTTPFile(
                            url: ""
                        ),
                        mediaType: "image/svg+xml"
                    )
                    return MetadataViews.NFTCollectionDisplay(
                        name: "FlowPuzzle Collection",
                        description: "This is an onchain interactive puzzle based NFT collection",
                        externalURL: MetadataViews.ExternalURL(""),
                        squareImage: media,
                        bannerImage: media,
                        socials: {
                        }
                    )
                case Type<MetadataViews.Traits>():
                 
                    let traitsView = MetadataViews.dictToTraits(dict: self.metadata, excludedNames: [])

                    let mintedTimeTrait = MetadataViews.Trait(name: "mintedTime", value: self.metadata["mintedTime"]!, displayType: "Date", rarity: nil)
                    traitsView.addTrait(mintedTimeTrait)

                    return traitsView

            }
            return nil
        }
    }

    /// Defines the methods that are particular to this NFT contract collection
    ///
    pub resource interface FlowPuzzleNFTCollectionPublic {
        pub fun deposit(token: @NonFungibleToken.NFT)
        pub fun getIDs(): [UInt64]
        pub fun borrowNFT(id: UInt64): &NonFungibleToken.NFT
        pub fun borrowFlowPuzzleNFT(id: UInt64): &FlowPuzzleNFT.NFT? {
            post {
                (result == nil) || (result?.id == id):
                    "Cannot borrow FlowPuzzleNFT reference: the ID of the returned reference is incorrect"
            }
        }
    }


    pub resource Collection: FlowPuzzleNFTCollectionPublic, NonFungibleToken.Provider, NonFungibleToken.Receiver, NonFungibleToken.CollectionPublic, MetadataViews.ResolverCollection {
    
        pub var ownedNFTs: @{UInt64: NonFungibleToken.NFT}

        init () {
            self.ownedNFTs <- {}
        }

        pub fun withdraw(withdrawID: UInt64): @NonFungibleToken.NFT {
            let token <- self.ownedNFTs.remove(key: withdrawID) ?? panic("missing NFT")

            emit Withdraw(id: token.id, from: self.owner?.address)

            return <-token
        }


        pub fun deposit(token: @NonFungibleToken.NFT) {
            let token <- token as! @FlowPuzzleNFT.NFT

            let id: UInt64 = token.id

            let oldToken <- self.ownedNFTs[id] <- token

            emit Deposit(id: id, to: self.owner?.address)

            destroy oldToken
        }

        pub fun getIDs(): [UInt64] {
            return self.ownedNFTs.keys
        }

        pub fun borrowNFT(id: UInt64): &NonFungibleToken.NFT {
            return (&self.ownedNFTs[id] as &NonFungibleToken.NFT?)!
        }

        pub fun borrowFlowPuzzleNFT(id: UInt64): &FlowPuzzleNFT.NFT? {
            if self.ownedNFTs[id] != nil {
                // Create an authorized reference to allow downcasting
                let ref = (&self.ownedNFTs[id] as auth &NonFungibleToken.NFT?)!
                return ref as! &FlowPuzzleNFT.NFT
            }

            return nil
        }

        pub fun borrowViewResolver(id: UInt64): &AnyResource{MetadataViews.Resolver} {
            let nft = (&self.ownedNFTs[id] as auth &NonFungibleToken.NFT?)!
            let FlowPuzzleNFT = nft as! &FlowPuzzleNFT.NFT
            return FlowPuzzleNFT as &AnyResource{MetadataViews.Resolver}
        }

        destroy() {
            destroy self.ownedNFTs
        }
    }


    pub fun createEmptyCollection(): @NonFungibleToken.Collection {
        return <- create Collection()
    }

     // Function to check if a token is available for sale
    pub fun isAvailableForSale(tokenId: UInt64): Bool {
        return tokenId > FlowPuzzleNFT.totalSupply
    }

    // Function to get the shuffled numbers and shuffle iteration for a token
    pub fun getShuffledNumbersForToken(tokenId: UInt64): ShuffleInfo {
        let tokenInfo: FlowPuzzleNFT.TokenInfo?  = self.movesCollection[tokenId]

        let shuffledTokenId: UInt64 = tokenInfo?.shuffleTokenId ?? tokenId

        return self._getShuffledNumbersForToken(tokenId: shuffledTokenId)
    }


    // Function to get the owner info for multiple tokens
    pub fun getOwnerInfoForTokens(tokenIds: [UInt64]): [UInt8] {
        var ownerInfo: [UInt8] = []
        for tokenId in tokenIds {
            if let tokenInfo = self.movesCollection[tokenId] {
                ownerInfo.append(1)
            } else {
                ownerInfo.append(0)
            }
        }
        return ownerInfo
    }

    // Function to get the moves for a token
    pub fun getMovesForToken(tokenId: UInt64): [UInt8] {
        let tokenInfo: FlowPuzzleNFT.TokenInfo?  = self.movesCollection[tokenId]
        return tokenInfo?.movesData ?? []
    }

    pub fun verifyAndMintNFT(
            recipient: &{NonFungibleToken.CollectionPublic},
            moves: [UInt8], 
            shuffleIterationCount: UInt16
        ) {
            let tokenId: UInt64 = FlowPuzzleNFT.totalSupply + 1

            assert(tokenId <= self.maxTokens, message: "Invalid tokenId")

            // Ensure that the moves data is not empty
            if moves.length == 0 {
                panic("Moves data is empty")
            }

            // verify user submitted moves data onchain
            if self.verifyMoves(tokenId: tokenId, moves: moves, shuffleIterationCount: shuffleIterationCount) {
                panic("Puzzle not solved, unable to verify moves")
            }

            let metadata: {String: AnyStruct} = {}
            let currentBlock = getCurrentBlock()
            metadata["mintedBlock"] = currentBlock.height
            metadata["mintedTime"] = currentBlock.timestamp
            metadata["minter"] = recipient.owner!.address

            // create a new NFT
            var newNFT <- create NFT(
                id: tokenId,
                baseUrl: FlowPuzzleNFT.baseUrl,
                metadata: metadata,
            )

            // deposit it in the recipient's account using their reference
            recipient.deposit(token: <-newNFT)

            FlowPuzzleNFT.totalSupply = FlowPuzzleNFT.totalSupply + UInt64(1)

            self.movesCollection[tokenId] = TokenInfo(shuffleTokenId: tokenId, movesData: moves)

    }

    pub fun resolveView(_ view: Type): AnyStruct? {
        switch view {
            case Type<MetadataViews.NFTCollectionData>():
                return MetadataViews.NFTCollectionData(
                    storagePath: FlowPuzzleNFT.CollectionStoragePath,
                    publicPath: FlowPuzzleNFT.CollectionPublicPath,
                    providerPath: /private/flowPuzzleNFTCollection,
                    publicCollection: Type<&FlowPuzzleNFT.Collection{FlowPuzzleNFT.FlowPuzzleNFTCollectionPublic}>(),
                    publicLinkedType: Type<&FlowPuzzleNFT.Collection{FlowPuzzleNFT.FlowPuzzleNFTCollectionPublic,NonFungibleToken.CollectionPublic,NonFungibleToken.Receiver,MetadataViews.ResolverCollection}>(),
                    providerLinkedType: Type<&FlowPuzzleNFT.Collection{FlowPuzzleNFT.FlowPuzzleNFTCollectionPublic,NonFungibleToken.CollectionPublic,NonFungibleToken.Provider,MetadataViews.ResolverCollection}>(),
                    createEmptyCollectionFunction: (fun (): @NonFungibleToken.Collection {
                        return <-FlowPuzzleNFT.createEmptyCollection()
                    })
                )
            case Type<MetadataViews.NFTCollectionDisplay>():
                let media = MetadataViews.Media(
                    file: MetadataViews.HTTPFile(
                        url: ""
                    ),
                    mediaType: "image/svg+xml"
                )
                return MetadataViews.NFTCollectionDisplay(
                    name: "FlowPuzzle NFT Collection",
                    description: "This is an onchain interactive puzzle based NFT collection",
                    externalURL: MetadataViews.ExternalURL(""),
                    squareImage: media,
                    bannerImage: media,
                    socials: {
                    }
                )
        }
        return nil
    }

    pub fun getViews(): [Type] {
        return [
            Type<MetadataViews.NFTCollectionData>(),
            Type<MetadataViews.NFTCollectionDisplay>()
        ]
    }

    init(baseUrl: String) {
        self.totalSupply = 0
        self.maxTokens = 100
        self.movesCollection = {}

        self.baseUrl = baseUrl

        self.CollectionStoragePath = /storage/flowPuzzleNFTCollection
        self.CollectionPublicPath = /public/flowPuzzleNFTCollection

        let collection <- create Collection()
        self.account.save(<-collection, to: self.CollectionStoragePath)

        self.account.link<&FlowPuzzleNFT.Collection{NonFungibleToken.CollectionPublic, FlowPuzzleNFT.FlowPuzzleNFTCollectionPublic, MetadataViews.ResolverCollection}>(
            self.CollectionPublicPath,
            target: self.CollectionStoragePath
        )

        emit ContractInitialized()
    }

    pub fun _getShuffledNumbersForToken(tokenId: UInt64): ShuffleInfo {
        return self._getShuffledNumbersForTokenWithIteration(tokenId: tokenId, shuffleIterationCount: 0,skipCheckSolvable: false)
    }

    pub fun _getShuffledNumbersForTokenWithIteration(tokenId: UInt64, shuffleIterationCount: UInt16, skipCheckSolvable: Bool): ShuffleInfo {
        return self.shuffleNumbers(tokenId: tokenId, shuffleIteration: shuffleIterationCount, skipCheckSolvable: skipCheckSolvable)
    }

    pub fun shuffleNumbers(tokenId: UInt64, shuffleIteration: UInt16, skipCheckSolvable: Bool): ShuffleInfo {
        let numbers: [UInt8; 9] = [0, 1, 2, 3, 4, 5, 6, 7, 8]

        let shuffledTokenId: UInt64 = tokenId + UInt64(shuffleIteration)

        var i = 0
        while i < numbers.length {
            let n: UInt8 = UInt8(i) + UInt8(HashAlgorithm.SHA3_256.hash([UInt8(shuffledTokenId)])[0]) % UInt8(numbers.length - i)
            let temp: UInt8 = numbers[n]
            numbers[n] = numbers[i]
            numbers[i] = temp
            i = i + 1
        }

        if skipCheckSolvable || self.checkSolvable(puzzle: numbers) {
            return ShuffleInfo(shuffledNumbers: numbers, shuffleIterationCount: shuffleIteration)
        } else {
            return self.shuffleNumbers(tokenId: tokenId, shuffleIteration: shuffleIteration + 1, skipCheckSolvable: skipCheckSolvable)
        }
    }

    pub fun verifyMoves(tokenId: UInt64, moves: [UInt8], shuffleIterationCount: UInt16): Bool {
        let shuffleInfo = self._getShuffledNumbersForTokenWithIteration(tokenId: tokenId, shuffleIterationCount: shuffleIterationCount, skipCheckSolvable: true)

        let shuffledOrder = shuffleInfo.shuffledNumbers

        var indexOf1: UInt8 = 0
        var indexOf2: UInt8 = 0
        var indexOf3: UInt8 = 0
        var indexOf4: UInt8 = 0
        var indexOf5: UInt8 = 0
        var indexOf6: UInt8 = 0
        var indexOf7: UInt8 = 0
        var indexOf8: UInt8 = 0
        var indexOf0: UInt8 = 0

        var i = 0
        while i < shuffledOrder.length {
            var order = shuffledOrder[i]
            if order == 0 {
                indexOf0 = UInt8(i)
            } else if order == 1 {
                indexOf1 = UInt8(i)
            } else if order == 2 {
                indexOf2 = UInt8(i)
            } else if order == 3 {
                indexOf3 = UInt8(i)
            } else if order == 4 {
                indexOf4 = UInt8(i)
            } else if order == 5 {
                indexOf5 = UInt8(i)
            } else if order == 6 {
                indexOf6 = UInt8(i)
            } else if order == 7 {
                indexOf7 = UInt8(i)
            } else if order == 8 {
                indexOf8 = UInt8(i)
            }
            i = i+1
        }

        for move in moves {
            if move == 0x01 {
                indexOf0 = indexOf1
                indexOf1 = indexOf0
            } else if move == 0x02 {
                indexOf0 = indexOf2
                indexOf2 = indexOf0
            } else if move == 0x03 {
                indexOf0 = indexOf3
                indexOf3 = indexOf0
            } else if move == 0x04 {
                indexOf0 = indexOf4
                indexOf4 = indexOf0
            } else if move == 0x05 {
                indexOf0 = indexOf5
                indexOf5 = indexOf0
            } else if move == 0x06 {
                indexOf0 = indexOf6
                indexOf6 = indexOf0
            } else if move == 0x07 {
                indexOf0 = indexOf7
                indexOf7 = indexOf0
            } else if move == 0x08 {
                indexOf0 = indexOf8
                indexOf8 = indexOf0
            }
        }

        return indexOf1 == 0 && indexOf2 == 0x01 && indexOf3 == 0x02 && indexOf4 == 0x03
            && indexOf5 == 0x04 && indexOf6 == 0x05 && indexOf7 == 0x06 && indexOf8 == 0x07
            && indexOf0 == 0x08
    }

    pub fun checkSolvable(puzzle: [UInt8; 9]): Bool {
        var parity: UInt16 = 0
        let gridWidth: UInt8 = 3
        var row: UInt8 = 0
        var blankRow: UInt8 = 0

        var i: Int = 0

        while i < puzzle.length {
            if UInt8(i) % gridWidth == 0 {
                row = row + 1
            }
            if puzzle[i] == 0 {
                blankRow = row
                i = i+1
                continue
            }
            var j = i+1

            while j< puzzle.length {
                if puzzle[i] > puzzle[j] && puzzle[j] != 0 {
                    parity = parity + 1
                }
                j = j+1
            }
            i = i+1
        }

        if gridWidth % 2 == 0 {
            if blankRow % 2 == 0 {
                return parity % 2 == 0
            } else {
                return parity % 2 != 0
            }
        } else {
            return parity % 2 == 0
        }
    }
}