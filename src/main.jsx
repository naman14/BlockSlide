import { render } from "react-dom";
// import {
//   BrowserRouter,
//   Routes,
//   Route
// } from "react-router-dom";
import FlowPuzzle from "./index";
// import PlayToken from "./playtoken";
// import FlowPuzzleReplay from "./replay";

const rootElement = document.getElementById("root");
render(
    <FlowPuzzle/>,
  rootElement
);
// render(
//   <BrowserRouter basename="/game">
//     <Routes>
//       <Route path="/" element={<FlowPuzzle />} />
//       <Route path="/:tokenId" element={<PlayToken />} />
//       <Route path="replay" element={<FlowPuzzleReplay />} />
//     </Routes>
//   </BrowserRouter>,
//   rootElement
// );