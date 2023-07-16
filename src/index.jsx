

// import * as $ from 'jquery'; 
import ReactDOM from "react-dom";
import { StrictMode } from 'react'

import * as fcl from "@onflow/fcl"

import './css/main.scss'
import Header from './header';
import Game from './game/Game'
import { getImageUrl, getAllImages } from "./tokenImage";
import { playAudio, stopAllAudio } from "./loopedAudio";
import { packMovesToChain } from "./onchainmoves";
import { formatTime, shuffle } from './utils'
import { tokenMusicUri, preloadAssetsForToken, getTokenTileMusic } from "./assets";
import FlowPuzzleReplay from "./replay";
import { FixedSizeGrid as Grid } from 'react-window';
import AutoSizer from "react-virtualized-auto-sizer";
import Confetti from 'react-confetti'
import { Step } from './game/lib/search'
import { CONTRACT_ADDRESS, contractGetShuffledOrder, contractGetTotalMinted, contractIsAvailableForSale, contractMintNFT, setupFLow } from "./flowPuzzleContract";

var timeout = null;
var correctTilePositions = []
var cachedTokenInfo = {}
var pendingTokenFetch = {}
var TOKEN_SEARCH_COLUMN_COUNT = 6

export default class FlowPuzzle extends React.Component {

    constructor() {
        super();
        this.state = {
            loading: false,
            moves: [],
            steps: [],
            time: formatTime(0),
            isSolved: false,
            connectedAccount: "",
            mintedCount: 0,
            selectedPuzzle: {
                tokenId: -1,
                selectionComplete: false
            },
            mintPrice: -1,
            availableTokens: [],
            tokenInfo: undefined,
            puzzleConfirmed: false,
            shuffledOrder: undefined,
            shuffleIterationCount: 0,
            isMinting: false,
            isMinted: false,
            isMintingError: false,
            mintingErrorText: undefined,
            error: undefined,
            footerMessage: "",
            tokenReplay: undefined,
            isTokenReplay: false,
            tokensToSelect: undefined,
            filteredTokensToSelect: undefined,
            walletConnectSkip: false,
        };
        this.isOver = false;
        this.moves = 0;

        this.startPuzzle = this.startPuzzle.bind(this);
        this.puzzleSolved = this.puzzleSolved.bind(this);
        this.getMintedTotal = this.getMintedTotal.bind(this);
        this.confirmPuzzle = this.confirmPuzzle.bind(this);
        this.setMintingAnimation = this.setMintingAnimation.bind(this);
        this.setError = this.setError.bind(this);
        this.reselectPuzzle = this.reselectPuzzle.bind(this);
        this.tileMoved = this.tileMoved.bind(this);

        this.moves = []

        // this.keyDownListener = this.keyDownListener.bind(this);
        // document.addEventListener('keydown', this.keyDownListener);

        this.game = React.createRef();
        this.replayGame = React.createRef();
    }

    componentDidMount() {
       setupFLow()
          
        this.checkIfWalletIsConnected()

        this.getMintedTotal()
    }

    checkIfWalletIsConnected = async () => {
        this.setState({loading: true})
        let connected = await fcl.currentUser().snapshot()
        if (connected && connected.addr) {
            this.onWalletConnected(connected.addr)
        }
        this.setState({loading: false})
      }
    
    onWalletConnected = async (account) => {
        if (account) {
            console.log("Found an authorized account:", account);
            this.setState({connectedAccount: account})
            this.setupGame()
        }
    }

    setupGame = async () => {

        let tokenId = this.props.tokenId
        if (!tokenId) {
            let currentUrl = new URL(window.location.href);
            let queryTokenId = currentUrl.searchParams.get("tokenId");
            if (queryTokenId && queryTokenId != '' && parseInt(queryTokenId) > 0 && parseInt(queryTokenId) < 101) {
                tokenId = queryTokenId
            }
        }

        if (tokenId) {
            this.setState({loading: true, isTokenReplay: true})
            let available = await this.isTokenAvailable(tokenId)
            if (!available) {
                await this.getOwnerInfoForToken(tokenId)
                this.setState({loading: false})
            } else {
                this.setState({
                    selectedPuzzle: {...this.state.selectedPuzzle, tokenId: tokenId, tokenInfo: undefined}
                })
                this.selectToken()
            }
        } else {
            this.setState({isTokenReplay: false})
            this.selectToken()
        }
    }

    connectWallet = async () => {
        try {
            let connected = await fcl.authenticate()
            if (connected && connected.addr) {
                this.onWalletConnected(connected.addr)
            }

        } catch (error) {
          console.log(error)
        }
      }
    
    connectWalletLater = () => {
        this.setState({
            walletConnectSkip: true
        })
        this.setupGame()
    }

    askContractToMintNft = async () => {
        try {
           
            
            if (this.state.connectedAccount == '') {
                this.connectWallet()
                return
            }

            let tokenId = this.state.selectedPuzzle.tokenId

            let isAvailable = await contractIsAvailableForSale(tokenId)
            console.log('token available: ' + isAvailable)

            if (!isAvailable) {
                this.getOwnerInfoForToken(tokenId)
                return
            }

            await this.fetchMintPrice()
    
            let base4moves = this.state.steps.map((step) => {
                if (step == Step.Up) {
                    return 1;
                }
                if (step == Step.Down) {
                    return 2;
                }
                if (step == Step.Left) {
                    return 3;
                }
                if (step == Step.Right) {
                    return 4;
                }
            })

            console.log('tokens to mint: ' + tokenId)
            
            let packedMoves = packMovesToChain(base4moves)

            console.log('packedMoves: ' + packedMoves)
            console.log('iterationCount: ' + this.state.shuffleIterationCount)

            console.log("Minting... please wait")
            this.setMintingAnimation(true, false, false);

            let chainMoves = packedMoves.join('').toString().split('').map((item) => parseInt(item))
            let nftTxn = await contractMintNFT(chainMoves, this.state.shuffleIterationCount)

            this.nftTxn = nftTxn

            console.log(`Mined, tee transaction: https://testnet.flowscan.org/transaction/${nftTxn}`)

            this.setMintingAnimation(false, true, false)
          
        } catch (error) {
          console.log(error)
          if (error.code == 'INSUFFICIENT_FUNDS') {
            console.log('insufficient funds')
            this.setMintingAnimation(false, false, true, "Insufficient Funds")
            } else {
                this.setMintingAnimation(false, false, true)
            }
        }
    }

    setMintingAnimation(isMinting, isMinted, isError, mintingErrorText) {
        this.setState({isMinting: isMinting, isMinted: isMinted, isMintingError: isError, mintingErrorText: mintingErrorText})
    }

    setError = (title, subtitle, showRestart) => {
        this.setState({error: {title: title, subtitle: subtitle, showRestart: showRestart}})
    }

    getMintedTotal = async () => {
        let count = await contractGetTotalMinted()
        this.setState({mintedCount: count})
      }

    getShuffledNumbers = async () => {
        let shuffledNumbers = await contractGetShuffledOrder(this.state.selectedPuzzle.tokenId)
        return shuffledNumbers
      }

    
    getOwnerInfoForToken = async (tokenId) => {

        if (tokenId == this.state.selectedPuzzle.tokenId || tokenId == this.props.tokenId) {

            this.setState({
                tokenReplay: {
                    tokenId: tokenId
                }
            })
        } else {

            this.setState({
                footerMessage: `# ${tokenId} has been solved`
            })
            setTimeout(() => {
                this.setState({
                    footerMessage: ""
                })
            }, 10000)
        }
    }

    isTokenAvailable = async (tokenId) => {
        let available = await contractIsAvailableForSale(tokenId)
        console.log("token " + tokenId +  " available: " + available)
        return available
    }

    startPuzzle = async () => {
        let shuffleOrderInfo = await this.getShuffledNumbers()
        this.setState({shuffledOrder: shuffleOrderInfo.shuffledNumbers, shuffleIterationCount: shuffleOrderInfo.shuffleIterationCount})
        preloadAssetsForToken(this.state.selectedPuzzle.tokenId)
    }   

    puzzleSolved  = async () => {
        console.log('puzzle solved')
        this.setState({isSolved: true})
        this.fetchMintPrice()
        playAudio(tokenMusicUri(this.state.selectedPuzzle.tokenId), false)
    }

    fetchMintPrice = async () => {
        this.setState({ mintPrice: 0})
    }

    selectToken() {
        setTimeout(() => {
            this.fetchTokens()
        }, 100)
    }

    fetchTokens = async () => {
        let tokensToSelect = {}

        for (let i=1; i< 101; i++) {
            let tokenInfo = {
                tokenId: i,
                minted: undefined,
                mintedType: undefined,
                imageUrl: undefined
            }
            tokensToSelect[i] = tokenInfo
        }
        this.setState({
            tokensToSelect: tokensToSelect,
            filteredTokensToSelect: tokensToSelect
        })

        let allImages = await getAllImages(this.state.selectedPuzzle.tokenType)
        Object.entries(tokensToSelect).forEach(
            ([indexKey, tokenInfo]) => {
                let image = allImages[indexKey]
                tokenInfo.imageUrl = image
            }
        );
        this.setState({
            tokensToSelect: tokensToSelect,
            filteredTokensToSelect: tokensToSelect
        })

        try {
            let mintedCount = await contractGetTotalMinted()
            console.log('minted count 2: ' + mintedCount)
            let tokens = {}
            Object.entries(this.state.tokensToSelect).forEach(
                ([indexKey, tokenInfo]) => {
                    tokens[indexKey] = tokenInfo
                    if (tokenInfo.tokenId > mintedCount) {
                        tokens[indexKey].minted = false
                    } else {
                        tokens[indexKey].minted = true
                    }
                }
            );
            this.setState({
                tokensToSelect: tokens,
            })
        } catch (e) { }
       
    }

    getCurrentTokenInfo = async () => {
        this.setState({loading: true})

        let tokenId = this.state.selectedPuzzle.tokenId
        let available = await this.isTokenAvailable(tokenId)


        let tokenInfo = {
            minted: !available,
        }
        this.setState({tokenInfo: tokenInfo, loading: true})

        let url = getImageUrl(tokenId, tokenType)
        tokenInfo.imageUrl = url
        this.setState({tokenInfo: tokenInfo, loading: false})
    }

    confirmPuzzle = async () => {
        console.log("puzzle confirmed: tokenId: " + this.state.selectedPuzzle.tokenId)
        let available = await this.isTokenAvailable(this.state.selectedPuzzle.tokenId)
        if (!available) {
            await this.getOwnerInfoForToken(this.state.selectedPuzzle.tokenId)
            this.setState({loading: false})
        } else {
            let imageUrl = getImageUrl(this.state.selectedPuzzle.tokenId, this.state.selectedPuzzle.tokenType)
            this.setState({puzzleConfirmed : true, selectedPuzzle: {...this.state.selectedPuzzle, imageUrl: imageUrl, selectionComplete: true}})
            this.startPuzzle()
            this.setState({loading: false})
        }
    }

    selectTokenPreview = async(tokenInfo) => {
        this.setState({selectedPuzzle: {...this.state.selectedPuzzle, tokenId: tokenInfo.tokenId}})
        setTimeout(() => {
            this.confirmPuzzle()
        }, 100)
    }

    reselectPuzzle() {
        this.setState({
            moves: [],
            steps: [],
            time: formatTime(0),
            isSolved: false,
            selectedPuzzle: {
                tokenId: -1,
                selectionComplete: false
            },
            tokenInfo: undefined,
            puzzleConfirmed: false,
            shuffledOrder: undefined,
            isMinting: false,
            isMinted: false,
            isMintingError: false,
            mintingErrorText: undefined,
            error: undefined,
            tokenReplay: undefined,
            isTokenReplay: false,
            loading: false
        })
        console.log('reselcting puzzle')
        stopAllAudio()
    }

    resetPuzzle = () => {
        this.setState({moves: [], steps: []})
        this.game.current.resetToShuffle()
        stopAllAudio()
    }
    
    tileMoved(moves, steps) {
        let isGameOver = moves.length > 250
        if (isGameOver) {
            this.setError("Game over", "You took too many moves to solve the puzzle.", true)
            stopAllAudio()
            return
        }
        this.setState({moves: moves, steps: steps})
        if (moves.length > 0) {
            let gridList = this.game.current.getGridList()
            for (let i = 0; i< 8; i++) {
                let value = i + 1
                if (gridList[i] == value && !correctTilePositions.includes(value)) {
                    correctTilePositions.push(value)
                    getTokenTileMusic(this.state.selectedPuzzle.tokenId, (audio) => {
                        playAudio(audio[i], true)
                    })
                }
            }
        }
    }

    onSetupComplete = async () => {}

    //TESTING TEMPORARY
    // keyDownListener(key) {
    //     console.log('pressed')
    //        // End game by pressing CTRL + ALT + F
    //     if (key.ctrlKey && key.altKey && key.code === 'KeyF') {
    //         console.log('hereee')
    //         this.game.current.requestSolve()
    //     }
    // }

    shouldShowConnectWallet = () => {
        return this.state.connectedAccount == '' && !this.state.walletConnectSkip && !this.state.error
      }

    downloadPuzzle = () => {
        this.replayGame.current.download()
    }

    renderMintButton = () => {
        console.log('batchMintCount: ' + this.state.maxBatchMintCount)
        let maxBatchArray = []
        for (let i=0; i< this.state.maxBatchMintCount; i++) {
            maxBatchArray.push(i)
        }
       return this.state.connectedAccount == '' ? (

             <button
                className="mint-button" 
                onClick={this.connectWallet}>
                    <h2 className='connect-wallet'>
                            Connect Wallet to MINT
                    </h2>
            </button>
        ) : (
            <div style={{display: 'flex', flexDirection: 'column'}}>

                {/* <div style={{display: 'flex', flexDirection: 'row'}}>

                    <h3>Mint Count:</h3>

                    { this.state.maxBatchMintCount != -1 && 
                        <select 
                            name="mint-count" 
                            id="mint-count" 
                            onChange={this.selectBatchMintAmount}
                            style={{marginLeft: '15px', borderWidth: '1.5px', alignSelf: 'center', width: '100px', height: '30px', color: 'white', backgroundColor: 'black', marginTop: '10px'}}>
                        {
                         maxBatchArray.slice(0, 5).map((item) => {
                            return <option key={item} value={item + 1}>{item + 1}</option>
                         })   
                        }
                    
                        
                    </select>
                 }
                </div> */}

                    <button
                        className="mint-button" 
                        onClick={this.askContractToMintNft}>
                            <h2 className='connect-wallet'>
                                        MINT {this.state.mintPrice != -1 ? ( this.state.mintPrice == 0 ? `(FREE)` : `(${this.state.mintPrice} FLOW)`)  : "(... FLOW)"}
                            </h2>
                    </button>
                    {/* <h4 style={{opacity: '0.7'}}>Be quick, Someone else might mint before you</h4> */}
            </div>

            
        )
       
      
        }
    

      renderSelectNumberContainer = () => {
        const GUTTER_SIZE = 25;
        const COLUMN_WIDTH = 250;
        const ROW_HEIGHT = 250;
        const COLUMN_COUNT = TOKEN_SEARCH_COLUMN_COUNT
        let data = []
        if (this.state.showAvailableTokensOnly) {
            data = Object.values(this.state.filteredTokensToSelect).filter((item) => !item.minted)
        } else {
            data = Object.values(this.state.filteredTokensToSelect)
        }
        const ROW_COUNT = data.length / TOKEN_SEARCH_COLUMN_COUNT

            return (
                <div style={{display: 'flex', flexDirection: 'column'}} className="animate">
                    <div style={{display: 'flex', flexDirection: 'row', alignSelf: 'center', alignItems: 'flex-start'}}>

                    {/* <input className="select-number-search" type="number"
                                    id="searchToken" name="searchToken" onChange={this.searchToken}
                                    placeholder="Enter token number"/>

                    <div style={{display: 'flex', flexDirection: 'row', alignSelf: 'center', alignItems: 'center', marginLeft: '50px'}}>
                        <input style={{width: '25px', height: '25px', backgroundColor: 'black'}} type="checkbox" 
                            checked={this.state.showAvailableTokensOnly}
                            onClick={this.toggleShowAvailableTokensOnly}></input>
                        <h3 style={{marginLeft: '20px'}}>Show available only</h3>
                    </div>
                    */}
                    </div>
                   

                        {Object.values(this.state.filteredTokensToSelect).length > 0 && 
                        <AutoSizer style={{width: '100%', alignItems: 'flex-start', height: '780px'}}>
                            {({ height, width }) => (
                            <Grid
                                columnCount={COLUMN_COUNT}
                                columnWidth={COLUMN_WIDTH + GUTTER_SIZE}
                                height={height}
                                rowCount={ROW_COUNT}
                                rowHeight={ROW_HEIGHT + GUTTER_SIZE}
                                width={width}
                                itemData={data}
                            >
                                {this.TokenPreview}
                            </Grid>
                            )}
                        </AutoSizer>
                        }
                            
                </div>
              
            )
      }

        
      TokenPreview = ({ columnIndex, data, rowIndex, style }) => {
          let index = rowIndex * TOKEN_SEARCH_COLUMN_COUNT + columnIndex
          const tokenInfo = data[index]
            return (
                <div style={style} className="animate">
                    {
                        tokenInfo && 
                        <div key={tokenInfo.tokenId}>
                            <div className="token-preview" onClick={() => this.selectTokenPreview(tokenInfo)}>
                                    <img src={tokenInfo.imageUrl} className="preview-img"></img>
                                    <p className="number">#{tokenInfo.tokenId}</p>
                                    {tokenInfo.minted && (
                                                                                
                                            <p className="won">Solved</p>
                                    
                                        )

                                    }
                                </div>

                </div>
                    }
                
            </div>
        )
       
      }

    renderPuzzleContainer = () => (
        this.state.shuffledOrder && this.state.selectedPuzzle.imageUrl && (
            <div style={{display: 'flex', flexDirection: 'column'}}>

                <div className='puzzle-container animate'>
                    <div style={{display: 'flex', justifyContent: 'flex-end', width: '100%', marginLeft: '200px'}}>
                    <Game 
                        ref={this.game}
                        onSetupComplete={this.onSetupComplete}
                        onMove={this.tileMoved}
                        onSolve={this.puzzleSolved}
                        shuffleOrder={this.state.shuffledOrder}
                        puzzleImageUrl={this.state.selectedPuzzle.imageUrl}
                        moveDuration={-1}/>
                        
                    </div>
                    
                    <div className='game-info'>
                        {this.renderGameInfo()}
                    </div>

                    {this.state.isSolved &&
                    <Confetti
                        width={window.width}
                        height={window.height}
                        gravity={0.08}
                        numberOfPieces={20}
                        initialVelocityY={{min: 1, max: 1}}
                        initialVelocityX={{min: 1, max: 1}}
                        colors={["#856F56", "#FFFFFF", "#6A563F", "#1A43C8", "#1637A4", "#A98C6B", "#352410", "#95554F"]}
                        />
                    }
                </div>

                {
                    !this.state.isSolved &&
                    <h3 style={{fontSize: '17px', opacity: '0.7'}}>Click on tiles or use arrow keys to move tile into available position</h3>
                }
            </div>

        )
    )

    renderSolvingGame = () => (
        <div className="animate">
                   
                <div className='column' style={{marginTop: -10}}>

                    <h1 style={{fontSize: 50}}>
                        {"Block Slide"} #{this.state.selectedPuzzle.tokenId}
                    </h1>

                    {
                        this.state.isSolved ?  
                        (<h1 style={{marginTop: 25}}>You've finished in {this.state.moves.length} MOVES</h1>) : 
                        (<h3>{this.state.moves.length} MOVES</h3>)
                    }

                {
                    !this.state.isSolved &&
                    <button className="select-puzzle-button" onClick={this.reselectPuzzle}>Change Puzzle</button>
                }

                {/* {
                    !this.state.isSolved && 
                    <button className="select-puzzle-button" 
                    onClick={this.resetPuzzle}
                    style={{visibility: (!this.state.isSolved && this.state.moves.length > 0) ? 'visible' : 'hidden'}}
                    >Reset Puzzle
                    </button>
                } */}
               
                {
                this.state.isSolved && 
                    this.renderMintButton()
                }
                </div>
        </div>
    )

    renderMintingInfo = () => (
        <div className="animate">
            <h1 style={{fontSize: 50, marginTop: 30}}>
                Minting...
            </h1>
            <img src="https://i.ibb.co/bWNHYm7/miner.gif" height="150" width="150" alt="miner-animation" className="modalImg" />

        </div>

    )

    renderMintingErrorInfo = () => (
        <div className="animate">
              <h1 style={{fontSize: 50}}>
                        {'Block Slide'} #{this.state.selectedPuzzle.tokenId}
                    </h1>

            <h1>Error Minting</h1>
            {this.state.mintingErrorText ?   <h3>{this.state.mintingErrorText}</h3> :  <h3>An error occurred minting NFT.</h3>}
            <button
                    className="mint-button" 
                    onClick={this.askContractToMintNft}>
                        <h2 className='connect-wallet'>
                            TRY AGAIN {this.state.mintPrice != -1 ? ( this.state.mintPrice == 0 ? `(FREE)` : `(${this.state.mintPrice} FLOW)`)  : "(... FLOW)"}
                    </h2></button>
        </div>
    )

    renderMintedInfo = () => (
        <div className="animate">
            <h1>Minted</h1>
            <h3>Your puzzle NFT has been successfully minted</h3>
            <h2><a href={`https://testnet.flowscan.org/transaction/${this.nftTxn}`} target="_blank">Flowscan &#8599;</a></h2>
            <h2><a href={`https://nft.flowverse.co/collections/Flovatar/${CONTRACT_ADDRESS}/${this.state.selectedPuzzle.tokenId}`} target="_blank">Flowverse &#8599;</a></h2>
            <h2><a href={`https://namand.in/BlockSlide?tokenId=${this.state.selectedPuzzle.tokenId}`} target="_blank">View Replay NFT &#8599;</a></h2>
            <button className="mint-button" onClick={this.reselectPuzzle}>Solve another Puzzle</button>
        </div>
    )

    renderError = () => (
        <div className="center animate">
            <h1>{this.state.error.title}</h1>
            <h3>{this.state.error.subtitle}</h3>
            {
            this.state.error.showRestart &&
            <button className="button" onClick={this.reselectPuzzle}>Try another Puzzle</button>
            }
        </div>
    )

    renderConnectWallet = () => (
        <div className="game-title">
            <p>Block Slide</p>
            <div className="select-team-button-container">
                <div style={{display: 'flex', flexDirection:'column', marginTop: '40px'}}>
                    <button style={{color: 'black', marginTop: '35px'}} className="one" onClick={this.connectWallet}>Connect Wallet</button>
                    <button style={{color: 'white', backgroundColor: 'transparent', marginTop: '30px', padding: '10px', border: '1px solid', borderColor: '#000000'}} className="one" onClick={this.connectWalletLater}>Connect Later</button>
                </div>
            </div>
        </div>        
    )

    renderTokenReplay = () => (
        <div className='puzzle-container animate'>
            
            <div style={{display: 'flex', justifyContent: 'flex-end', width: '100%'}}>
                <FlowPuzzleReplay 
                ref={this.replayGame}
                replayStarted={true}
                tokenId={this.state.tokenReplay.tokenId}/>
            </div>
           
                
                <div className='game-info'>
                    <h1>Solved and Minted</h1>
                    <h2><a href={`https://nft.flowverse.co/collections/Flovatar/${CONTRACT_ADDRESS}/${this.state.selectedPuzzle.tokenId}`} target="_blank">Flowverse &#8599;</a></h2>
                    <h2><a className="download-puzzle" onClick={this.downloadPuzzle}>Download solved puzzle</a></h2>

                    <button className="mint-button" onClick={this.reselectPuzzle}>Solve another Puzzle</button>
                </div>
            
        </div>
    )



    renderGameInfo = () => {
        if (this.state.isMinting) {
            return this.renderMintingInfo()
        }
        if (this.state.isMinted) {
            return this.renderMintedInfo()
        }
        if (this.state.isMintingError) {
            return this.renderMintingErrorInfo()
        }
        return this.renderSolvingGame()
    }

    renderUI = () => {
        if (this.state.error) {
            return this.renderError()
        }
        if (this.state.loading) {
            console.log("rendering loader")
            return <div className="loader" style={{position: 'absolute'}} />
        }
        if (this.state.tokenReplay) {
            return this.renderTokenReplay()
        }
        if (this.state.puzzleConfirmed) {
            console.log("rendering puzzle confirmed")
            console.log(this.state.shuffledOrder , this.state.selectedPuzzle.imageUrl)
            return this.renderPuzzleContainer()
        }
        if (this.state.selectedPuzzle 
                && this.state.tokensToSelect) {
                    console.log("rendering select number container")
            return this.renderSelectNumberContainer()
        }
        console.log("rendering loader NA")
        return  <div className="loader" style={{position: 'absolute'}} />
    }

    render() {
        return (
            <div className="container">

               <Header connectedAccount={this.state.connectedAccount} 
                    onConnectClick={this.connectWallet}
                    mintedCount={this.state.mintedCount}
                    onHomeClick={this.reselectPuzzle}/>
            
            {
                (!this.shouldShowConnectWallet()) ? (
                    this.renderUI()
                ) : (
                    !this.state.loading && this.renderConnectWallet()
                )
            }

                {this.state.loading && <div className="loader"/>}
               
               <div className="footer">
                   {this.state.footerMessage != "" && <h3>{this.state.footerMessage}</h3>}
                   {<p>Contract Address: {CONTRACT_ADDRESS}</p>}
               </div>
               
            </div>
        );
    }
}