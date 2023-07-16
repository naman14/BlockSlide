import ReactDOM from "react-dom";
import { StrictMode } from 'react'
import { render } from "react-dom";
import './css/replay.scss'
import { getImageUrl } from "./tokenImage";
import Game from './game/Game'
import { solvePuzzleShuffledOrder } from "./game/puzzle";
import { playAudio, preloadAudio, stopAllAudio } from "./loopedAudio";
import { preloadAssetsForToken, preloadTokenMusic, preloadTokenTileMusic, tokenMusicUri, getTokenTileMusic } from "./assets";
import { unpackMovesFromChain } from "./onchainmoves";
import { Step } from './game/lib/search';
import  "./html2canvas.min.js";
import { contractGetShuffledOrder, contractGetMovesForToken, setupFLow } from "./flowPuzzleContract";

var correctTilePositions = []

export default class FlowPuzzleReplay extends React.Component {

    constructor() {
        super();
        this.state = {
            puzzleImageUrl: undefined,
            shuffledOrder: undefined,
            steps: undefined,
            tokenId: undefined,
            isAutoReplay: true,
            isMusicOn: false,
            loading: true,
            score: 0,
            useShortestAlgo: false,
            replayStarted: false
        };

        this.puzzleSolved = this.puzzleSolved.bind(this);
        this.tileMoved = this.tileMoved.bind(this);

        this.game = React.createRef();
    }

    componentDidMount() {
        setupFLow()

        let currentUrl = new URL(window.location.href);
        let queryTokenId = currentUrl.searchParams.get("tokenId");

        if (queryTokenId) {
            if (queryTokenId != '' && parseInt(queryTokenId) > 0 && parseInt(queryTokenId) < 10000) {
                this.tokenId = queryTokenId
            } else {
                console.log('invalid route')
                window.location.href = '/'
            }
        }
        if (this.props.tokenId) {
            if (this.tokenId < 1 || this.tokenId > 9999) {
                console.log('invalid route')
                window.location.href = '/'
            } else {
                this.tokenId = this.props.tokenId
            }
        }
        if (this.props.replayStarted) {
            this.startReplay()
        }
    }

    getTokenMetadata = async () => {
        if (!this.tokenId) {
            console.log('no tokenId set')
            return
        }
        console.log('tokenId: ' + this.tokenId)

        this.shuffledInfo = await contractGetShuffledOrder(this.tokenId)
        let packedMoves = await contractGetMovesForToken(this.tokenId)

        console.log('shuffledNumbers', this.shuffledInfo.shuffledNumbers)
        console.log('packedMoves', packedMoves)

        let moves = unpackMovesFromChain(packedMoves)
        
        let useShortestAlgo = false
        let steps = moves.map((step) => {
            if (step == 1) {
                return Step.Up;
            }
            if (step == 2) {
                return Step.Down;
            }
            if (step == 3) {
                return Step.Left;
            }
            if (step == 4) {
                return Step.Right;
            }
            useShortestAlgo = true
        })
    
        this.steps = steps

        this.score = this.calculateScore(this.shuffledInfo.shuffledNumbers, this.steps)

        let puzzleImage =  getImageUrl(this.tokenId)
        this.puzzleImageUrl = puzzleImage

        if (useShortestAlgo) {
            this.steps = solvePuzzleShuffledOrder(this.shuffledInfo.shuffledNumbers).answer.path
        }

        let totalMoves = this.steps.length
        let maxTargetTime = 15000
        let moveDuration = 250

        if (totalMoves * moveDuration > maxTargetTime) {
            moveDuration = maxTargetTime / totalMoves
        }
        
        this.moveDuration = moveDuration

        this.setState({
            tokenId: this.tokenId,
            puzzleImageUrl: this.puzzleImageUrl,
            shuffledOrder: this.shuffledInfo.shuffledNumbers,
            steps: this.steps,
            loading: false,
            score: this.score,
        })
    }

    calculateScore = (shuffledOrder, steps) => {
        let shortestSteps = solvePuzzleShuffledOrder(shuffledOrder).answer.path
        let score = Math.floor((shortestSteps.length / steps.length) * 100)
        if (score > 100) {
            score = 100
        }
        return score
    }

    onSetupComplete = async () => {
        if (this.state.isAutoReplay) {
            this.game.current.replay(this.steps)
            preloadTokenMusic(this.tokenId)
        }
    }

    puzzleSolved  = async () => {
        if (this.state.isAutoReplay) {
            this.game.current.restartReplay(this.steps)
        }
    }

    tileMoved = (moves) => {
        if (moves.length > 0 && !this.state.isAutoReplay && this.state.isMusicOn) {
            let gridList = this.game.current.getGridList()
            for (let i = 0; i< 8; i++) {
                let value = i + 1
                if (gridList[i] == value && !correctTilePositions.includes(value)) {
                    correctTilePositions.push(value)
                    getTokenTileMusic(this.state.tokenId, (audio) => {
                        playAudio(audio[i], true)
                    })
                }
            }
        }
    }

    overlayClicked = () => {
        if (this.state.puzzleImageUrl && this.state.shuffledOrder && this.state.isAutoReplay) {
            this.shufflePuzzle()
        }
    }

    toggleMusic = () => {
        if (this.state.isMusicOn) {
            stopAllAudio()
            this.setState({isMusicOn: false})
        } else {
            if (this.state.isAutoReplay) {
                playAudio(tokenMusicUri(this.state.tokenId))
            }
            this.setState({isMusicOn: true})
        }
    }

    shufflePuzzle = () => {
        if (this.state.puzzleImageUrl && this.state.shuffledOrder) {
            this.setState({isAutoReplay: false})
            this.game.current.resetToShuffle()
            stopAllAudio()
            this.setState({isMusicOn: false})
            preloadTokenTileMusic(this.state.tokenId)
        }
    }

    replayPuzzle = () => {
        if (this.state.puzzleImageUrl && this.state.shuffledOrder) {
            this.shufflePuzzle()
            this.setState({isAutoReplay: true})
            setTimeout(() => {
                this.game.current.replay(this.steps)
                playAudio(tokenMusicUri(this.state.tokenId))
                this.setState({isMusicOn: true})
            }, 500)
            stopAllAudio()
        }
    }

    rarityFrameBackground = () => {
        let score = this.state.score
        let background = `./normal.svg`
        if (score == 100) background =  `./flawless.svg`
        if (score >= 70 && score < 100) background = `./godlike.svg`
        return `url(${background})`
    }

    download() {
        this.setState({isAutoReplay: false})
        stopAllAudio()
        this.game.current.resetToSolved()
        setTimeout(() => {
            html2canvas(document.querySelector("#replay-game"), {
                scale: 5
            }).then(canvas => {
                let downloadLink = document.createElement('a');
                downloadLink.setAttribute('download', `Block Slide ${this.state.tokenId}.png`);
                let dataURL = canvas.toDataURL('image/png');
                let url = dataURL.replace(/^data:image\/png/,'data:application/octet-stream');
                downloadLink.setAttribute('href', url);
                downloadLink.click();
            });
        }, 1200)
    }

    startReplay = () => {
        this.getTokenMetadata()
        this.setState({replayStarted: true})
    }

    render() {
        if (!this.state.replayStarted) {
            return (
            <div onClick={this.startReplay} style={{display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', width: '100%'}}>
                 <p className="token-number" style={{fontSize: '50px'}}>Block Slide</p>
                <button className="start-replay-button">Click to Play</button>
            </div>
            )
        } else {
                return (
                    <div className="replay-puzzle-container animate">
                        
                        {this.state.shuffledOrder && this.state.puzzleImageUrl
                                && (
                                <div className='replay-puzzle'>
                                
                                            <div id="replay-game" onClick={this.overlayClicked} >
                                                <Game
                                                    ref={this.game}
                                                    onSetupComplete={this.onSetupComplete}
                                                    onMove={this.tileMoved}
                                                    onSolve={this.puzzleSolved}
                                                    shuffleOrder={this.state.shuffledOrder}
                                                    moveDuration={this.moveDuration}
                                                    puzzleImageUrl={this.state.puzzleImageUrl}
                                                    frameBackground={this.rarityFrameBackground}>
                                                </Game>
                                            </div>

                                        
                                    
                                <div className="action-controls">
                                    <p className="token-number">Score: {this.state.score}</p>
                                    <div>
                                        <img className="shuffle" src="./play.svg"onClick={this.shufflePuzzle}/>
                                        <img className="replay" src="./shuffle.svg"onClick={this.replayPuzzle}/>
                                        <img className="toggle-music" src={this.state.isMusicOn ? "./music_off.svg" : "./music_on.svg"} onClick={this.toggleMusic}/>
                                    </div>
                                </div>
                            </div>

                        )}
                        {this.state.loading &&  <div className="loader"/>}
                        
                    </div>
                )
                        }
    }
}

// const rootElement = document.getElementById("root");
// render(
//     <FlowPuzzleReplay/>,
//   rootElement
// );