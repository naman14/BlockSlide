import { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from 'react'
import styled from 'styled-components'

import Grid from '@components/Grid'
import { Icon } from '@components/Icon'
import IconButton from '@components/IconButton'
import Keys from '@components/Keys'
import Ribbon from '@components/Ribbon'

import { Step } from '@lib/search'

import { usePuzzle } from './puzzle'
import { Theme, ThemeOption } from './Theme'
import type { ThemeColor } from './tokens'
import { THEME_COLORS } from './tokens'
import { Status, MOVES, updateGridData, INITIAL_STATE, makeStateFromList, solvePuzzleShuffledOrder } from './puzzle'
import { isValidPosition, pairDiff, pairEq, pairSum } from '@lib/pair'

const Content = styled.div`
  width: 420px;
  height: 420px;
  display: flex;
  flex-direction: column;
  background-color: 'black';
  align-items: center;
  background-repeat: no-repeat;
  background-image: ${props => (props.frameBackground ? props.frameBackground : `url(/game/puzzle_frame_small.svg)`)};
`

const Stack = styled.div`
  display: flex;
  flex-direction: column;
  & > * + * {
    margin-top: 12px;
  }
`

const Head = styled.h2`
  text-align: center;
  color: black;
  font-family: var(--fontFamilyPrimary);
  margin: 0;
  font-weight: normal;
  font-size: 1.25rem;
`

const Footer = styled.footer`
  margin: auto;
  padding: 64px 0;
  display: flex;
  justify-content: center;
  flex-direction: column;
  & > * {
    margin: 8px auto;
  }
  span {
    color: black;
  }
  p {
    color: hsl(359, 0%, 90%);
  }
  a {
    text-decoration: none;
    color: hsl(359, 0%, 90%);

    span {
      display: inline-block;
    }

    & > span:after {
      content: '';
      display: block;
      width: 90%;
      margin: auto;
      height: 0px;
      border: 1px dashed black;
    }

    :hover > span:after {
      border: 1px solid black;
    }
  }
  div > a {
    display: flex;
    align-items: center;
        > * + * {
      margin-left: 8px;
    }
  }
  ${Icon} {
    fill: black;
  }
`

const KeysContainer = styled.div`
  & > * + * {
    margin: 12px auto;
  }
`

const ContentWrapper = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;

  ${Ribbon} {
    margin: 24px 0 0 0;
  }

  ${Stack} {
    margin-top: 140px;
  }

  p {
    margin: 12px 0;
    font-family: var(--fontFamilyPrimary);
    color: black;
    font-size: 1rem;
  }

  h3 {
    padding: 0;
    font-family: var(--fontFamilySecondary);
    font-weight: normal;
    color: black;
    transition: opacity 0.5s ease, max-height 0.5s ease, margin 0.25s ease;
    max-height: 0px;
    overflow: hidden;
    margin: 0px;
    opacity: 0;
    &[data-show] {
       opacity: 1;
       max-height: 35px;
       margin: 16px;
    }
  }

  @media (max-width: 640px) {
    flex-direction: column;
    justify-content: flex-start;
    align-items: center;

    ${Content} {
      margin-left: 0px;
      width: 100%;
    }

    ${Stack} {
      margin-top: 32px;
    }

    ${KeysContainer} {
      display: flex;

      & > * {
        margin: auto 8px;
      }
    }
  }
`

const AppWrapper = styled.div`
  background-color: black;
  color: transparent;
  font-family: var(--fontFamilyPrimary);
`

const ButtonContainer = styled.div`
  position: relative;
  display: flex;
  margin: 10px;
  div {
    margin: 0 10px;
  }

`

function useHandler<T>(value: T) {
  const [state, setState] = useState<T>(value)

  const handler = useCallback((value: T) =>
    () => {
      setState(value)
    }, [])

  return [state, handler] as const
}

let finalShuffleOrder: any = undefined
let finalShuffledImages: any = undefined

export default forwardRef(({puzzleImageUrl, shuffleOrder, onSetupComplete, onMove, onSolve, moveDuration, frameBackground}, ref) => {

  if (moveDuration == -1) moveDuration = 250
  
  const [state, dispatch] = usePuzzle(moveDuration)
  const [theme, handleTheme] = useHandler<ThemeColor>('purple')
  

  useEffect(() => {

    var image = new Image(900, 900);
    image.crossOrigin="anonymous"
    image.setAttribute('crossorigin', 'anonymous');
    image.onload = resizeImage;
    image.src = puzzleImageUrl;
    image.style.height = '900px'
    image.style.width = '900px'
    image.style.objectFit = 'cover';

    var resizedImage = new Image(900, 900);
    resizedImage.crossOrigin="anonymous"
    resizedImage.setAttribute('crossorigin', 'anonymous');
    resizedImage.onload = cutImageUp;
    resizedImage.style.height = '900px'
    resizedImage.style.width = '900px'
    resizedImage.style.objectFit = 'cover';


    function resizeImage() {
      var cc = document.createElement("canvas");
      cc.width = 900;
      cc.height = 900;
      var ctx = cc.getContext("2d");
      ctx.drawImage(image, 0, 0, cc.width, cc.height);

      var resizedImageUrl = cc.toDataURL()
      resizedImage.src = resizedImageUrl;
    }

    function cutImageUp() {
      
      const numColsToCut = 3
      const numRowsToCut = 3
      const widthOfOnePiece = 300;
      const heightOfOnePiece = 300;
        var imagePieces = [];
        for(var y = 0; y < numRowsToCut; ++y) {
            for(var x = 0; x < numColsToCut; ++x) {
                var canvas = document.createElement('canvas');
                canvas.width = widthOfOnePiece;
                canvas.height = heightOfOnePiece;
                var context = canvas.getContext('2d');
                context.drawImage(resizedImage, x * widthOfOnePiece, y * heightOfOnePiece, widthOfOnePiece, heightOfOnePiece, 0, 0, canvas.width, canvas.height);
                let url = canvas.toDataURL()
                imagePieces.push(url);
            }
        }
        var shuffledImages = new Map()

        // 0,1,2,3,4,5,6,7,8
        // 7,6,8,4,3,1,5,2,0

        // image at 0 -> digit 1
        // image at 1 -> digit 2
        //...
        // image at 8 -> 0

        // image at last square would be at 0 digit (last digit)
        // image at 1 should be 


        imagePieces.forEach(function (image, i) {
          if (i == 8) {
              shuffledImages.set(0, imagePieces[8])
          } else {
              shuffledImages.set(i + 1, image)
          }
        });
      
        finalShuffleOrder = shuffleOrder
        finalShuffledImages = shuffledImages

        state.gridData.shuffleOrder = shuffleOrder
        state.gridData.images = shuffledImages
        
        dispatch({ type: 'SETUP', payload: state.gridData })

        setTimeout(() => {
          onSetupComplete()
        }, 300)
      }

    const keyListener = (event: KeyboardEvent) => {
      switch (event.code) {
        case 'Down':
        case 'KeyS':
        case 'ArrowDown':
          dispatch({ type: 'MOVE', payload: Step.Down })
          break
        case 'Up':
        case 'KeyW':
        case 'ArrowUp':
          dispatch({ type: 'MOVE', payload: Step.Up })
          break
        case 'Left':
        case 'KeyA':
        case 'ArrowLeft':
          dispatch({ type: 'MOVE', payload: Step.Left })
          break
        case 'Right':
        case 'KeyD':
        case 'ArrowRight':
          dispatch({ type: 'MOVE', payload: Step.Right })
          break
        default:
          break
      }
    }

    document.addEventListener('keydown', keyListener)

  
    return () => {
      document.removeEventListener('keydown', keyListener)
    }
  }, [dispatch])


  useEffect(() => {
    if (state.gridData.shuffleOrder.length > 0 && state.isFinalState) {
       onSolve()
    }
  },[state.isFinalState])

  useEffect(() => {
    if (state.gridData.shuffleOrder.length > 0) {
       onMove(state.gridData.moves, state.gridData.steps)
    }
  },[state.gridData.moves])

  const solve = () => {
    dispatch({ type: 'START', payload: [] })
  }

  const reset = () => {
    dispatch({ type: 'RESET' })
  }

  const random = () => {
    dispatch({ type: 'RANDOM' })
  }

  const attemptMove = (digit) => {
    let validMove = findValidMove(digit, state.gridData)
    if (validMove) {
      dispatch({ type: 'MOVE', payload: validMove })
    }
  }

  const findValidMove = (digit, grid) => {
    const clickedSquare = grid.data.find (square => square.digit == digit)
    if (!clickedSquare) return
    const zeroSquare = grid.data[grid.zeroIndex]
    // find out which move can be done at this position, if any
    let validMove = undefined
    const diff = pairDiff(clickedSquare.position, zeroSquare.position)

    let xDiff = diff[0]
    let yDiff = diff[1]
    if (xDiff > 1 || yDiff > 1) {
      // difference between zero square and clicked square is more than 1
      // no valid move can be done at this position
      return
    }
    if (xDiff == 0) {
      if (yDiff > 0) {
        validMove = Step.Up
      }
      if (yDiff < 0) {
        validMove = Step.Down
      }
    }
    if (yDiff == 0) {
      if (xDiff < 0) {
        validMove = Step.Right
      }
      if (xDiff > 0) {
        validMove = Step.Left
      }
    }
    return validMove
  }

  useImperativeHandle(ref, () => ({
    requestSolve() {
      solve()
    },

    getGridList() {
      return state.gridList
    },

    replay(steps) {
      dispatch({ type: 'START', payload: steps })
    },

    restartReplay(steps) {      
      
      let resetState = makeStateFromList(finalShuffleOrder)

      resetState.gridData.shuffleOrder = finalShuffleOrder
      resetState.gridData.images = finalShuffledImages
      
      state.gridData = resetState.gridData
      state.gridData.data = resetState.gridData.data

      setTimeout(() => {
        dispatch({ type: 'SETUP', payload: state.gridData })
        if (steps.length > 0) {
          this.replay(steps)
        }
      }, 500)
    },

    resetToShuffle() {
      dispatch({ type: 'STOP'})
      let resetState = makeStateFromList(finalShuffleOrder)
      resetState.gridData.shuffleOrder = finalShuffleOrder
      resetState.gridData.images = finalShuffledImages
      state.gridData = resetState.gridData
      state.gridData.data = resetState.gridData.data
      setTimeout(() => {
        dispatch({ type: 'SETUP', payload: state.gridData })
      }, 300)
    },

    resetToSolved() {
      dispatch({ type: 'STOP'})
      let solvedOrder = [1,2,3,4,5,6,7,8,0]
      state.gridData.shuffleOrder = solvedOrder
      state.gridData.images = finalShuffledImages
      setTimeout(() => {
        dispatch({ type: 'SETUP', payload: state.gridData })
      }, 200)
    }
  }));


  return (
    <Theme data-theme={theme}>
      <AppWrapper>
        <ContentWrapper>
          <Content frameBackground={frameBackground}>
            {state.gridData.images.size > 0  ? (
            <Grid 
              data={state.gridData} 
              isFinalState={state.isFinalState}
              squareShift={120}
              onClick={attemptMove} 
              animationDuration={moveDuration}/>
            ) : (<div className='loader'></div>)}
          </Content>
      
        </ContentWrapper>
      </AppWrapper>
    </Theme>
  )
})
