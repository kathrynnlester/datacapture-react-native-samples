import React, { Component } from "react";
import { View } from "react-native";
import { Wrapper } from "./wrapper";
import { IdCapture } from "scandit-react-native-datacapture-id";

export class App extends Component {
  render() {
    return (
      <View style={{ flex: 1 }}>
        <Wrapper cameraSettings={IdCapture.recommendedCameraSettings} />
      </View>
    );
  }
}
