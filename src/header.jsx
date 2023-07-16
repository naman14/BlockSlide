import './css/main.scss'
import './utils'

class Header extends React.Component {

    constructor() {
        super();
    }

    render() {
        return (
                <div className="topnav">

                    <div className='left' onClick={this.props.onHomeClick}>
                        {
                            (true) ?
                                (<h1 style={{marginLeft: 30}}>Flow Puzzle</h1>) :
                                (<h1>{this.props.mintedCount} puzzles solved</h1>)
                        }
                    </div>

                    <div className='right'>
                        {
                        this.props.connectedAccount === "" 
                        ?  (<div onClick={this.props.onConnectClick}><h2 className='connect-wallet'>Connect Wallet</h2></div>)
                        :  <h2><a className="download-puzzle" onClick={this.props.onConnectClick}>{this.props.connectedAccount}</a></h2>
                        }
                    </div>

                </div>
        );
    }
}

export default Header;
