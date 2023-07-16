import styled from 'styled-components'
import type { GridData } from '../puzzle'
import Square from './Square'

type GridProps = {
  data: GridData
  squareShift: number
  className?: string,
  isFinalState: boolean,
  onClick: any,
  animationDuration: number
}

const Grid = ({ className, data, squareShift, isFinalState, onClick, animationDuration }: GridProps) => (
  <div className={className} >
    {data.data.map(({ digit, delta }) => (
      <Square
        isTransparent={!isFinalState && digit === 0}
        key={digit}
        delta={{ x: delta[0], y: delta[1] }}
        shift={squareShift}
        digit={digit}
        image={data.images.get(digit)}
        onClick={onClick}
        animationDuration={animationDuration}
      >
        {digit == 0 ? 9 : digit}
      </Square>
    ))}
  </div>
)

const GridSquares = styled(Grid)`
  width: 360px;
  margin-top: 30px;
  border-radius: 10px;
  display: flex;
  flex-wrap: wrap;
  transition: background-color 1.25s ease;
`

export default GridSquares
