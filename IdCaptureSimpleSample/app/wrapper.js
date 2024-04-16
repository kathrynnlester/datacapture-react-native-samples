import React, { Component } from "react";
import { View } from "react-native";
import { Scanner } from "./scanner";

export class Wrapper extends Component {
  render() {
    return (
      <View style={{ flex: 1 }}>
        <Scanner cameraSettings={this.props.cameraSettings} />
      </View>
    );
  }
}
