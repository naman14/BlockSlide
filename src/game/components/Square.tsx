import { animated, useSpring } from '@react-spring/web'
import styled from 'styled-components'

type SquareProps = {
  children: React.ReactNode
  className?: string
  delta: {
    x: number
    y: number
  }
  shift: number
  isTransparent?: boolean,
  digit: number,
  image: string,
  animationDuration: number
}

const Square = (
  { children, className, delta, shift, isTransparent, digit, image, onClick, animationDuration }: SquareProps
) => {
  let config = {}
  if (animationDuration > 0) {
    // config.duration = animationDuration + 100
  }
  const { x, y } = useSpring({config: config, x: delta.x * shift, y: delta.y * shift })

  const tileStyle = {
    width: `120px`,
    height: `120px`,
    backgroundImage: `url(${image})`,
    backgroundSize: `120px 120px`,
    x: x,
    y: y
  };

  return (
    <animated.div
      onClick={() => onClick(digit)}
      className={className}
      data-is-transparent={isTransparent ? '' : undefined}
      style={tileStyle}
    >
      <span>{children ?? '-'}</span>
    </animated.div>
  )
}

const SquareStyled = styled(Square)`
  width: 120px;
  height: 120px;
  box-sizing: border-box;
  border: 0.5px solid black;
  background-color: transparent;
  color: black;
  transition: color 1.25s ease;
  font-size: 12px;
  position: relative;
  padding: 5px;
  span {
    height: 90px;
    line-height: 90 px;
    display: block;
  }
  &[data-is-transparent] {
    opacity: 0;
  }
  text-align: left;
`

export default SquareStyled
