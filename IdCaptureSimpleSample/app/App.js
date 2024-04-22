import React, { Component } from "react";
import { View, Button } from "react-native";
import { IdScanner } from "./id-scanner";

export class App extends Component {
  constructor(props) {
    super(props);
    this.state = { isHidden: false };
  }

  onPress = () => {
    this.setState((prevState) => ({ isHidden: !prevState.isHidden }));
  };

  render() {
    return (
      <View style={{ flex: 1, paddingTop: 50, backgroundColor: "white" }}>
        <Button title="Toggle scanner" onPress={this.onPress} />
        {!this.state.isHidden && <IdScanner />}
      </View>
    );
  }
}
