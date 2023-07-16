import { useParams } from "react-router-dom";
import FlowPuzzle from "./index";

class PlayToken extends React.Component {

    constructor() {
        super();
    }

    componentDidMount() {
        
    }

    render() {
        return (
            <FlowPuzzle
                tokenId={this.props.params.tokenId}
                />
        )
    }
}

export default (props) => (
    <PlayToken
        {...props}
        params={useParams()}
    />
);