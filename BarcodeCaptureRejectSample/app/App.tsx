import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, AppState, AppStateStatus, BackHandler } from 'react-native';
import {
  BarcodeCapture,
  BarcodeCaptureFeedback,
  BarcodeCaptureOverlay,
  BarcodeCaptureOverlayStyle,
  BarcodeCaptureSession,
  BarcodeCaptureSettings,
  Symbology,
  SymbologyDescription,
} from 'scandit-react-native-datacapture-barcode';
import {
  Brush,
  Camera,
  CameraSettings,
  Color,
  DataCaptureContext,
  DataCaptureView,
  Feedback,
  FrameSourceState,
  RectangularViewfinder,
  RectangularViewfinderLineStyle,
  RectangularViewfinderStyle,
  VideoResolution,
} from 'scandit-react-native-datacapture-core';

import { requestCameraPermissionsIfNeeded } from './camera-permission-handler';

export const App = () => {

  const viewRef = useRef<DataCaptureView>(null);
  // Create data capture context using your license key.
  const dataCaptureContext = useMemo(() => {
    // There is a Scandit sample license key set below here.
	  // This license key is enabled for sample evaluation only.
	  // If you want to build your own application, get your license key
    // by signing up for a trial at https://ssl.scandit.com/dashboard/sign-up?p=test
    return DataCaptureContext.forLicenseKey(
      'Aa2k0xbKMtvDJWNgLU02Cr8aLxUjNtOuqXCjHUxVAUf/d66Y5Tm74sJ+8L0rGQUZ20e52VlMY9I7YW4W13kWbvp36R8jbqQy6yZUGS50G5n4fRItJD6525RcbTYZQjoIGHQqle9jj08ra19ZUy9RliVlOn3hHz4WrGO8vORyATmFXJpULzk0I5RpiT84ckXhG2Ri8jtIzoISX3zsoiLtXVRGjjrkbuGZzGbKA180JKEpdfSQwVyupLti5yNYHAeKihS6IOklCTz8CM1BfRC4zBdIDjbVEJPFgAsLvMU0rTyJhHkB5Ds4wfHbKNFhW0T2XkYLKkvZ7X/HnEVD5oz9Kl4T4rtRkepJfsXUWHUgVugjLO5vqwhMcHNV5XpK2Pk/SLrzGF1PDRu8f4ZhBLrWKknWq+5TSK8GWi4wmGpVvbxqHhLljzOzplYs8I5TtphZ3otJNLs10lhk1YN9cmdaxpdUuF4k0WDU1Qfco75p5G+MBlsAVVFrs0xMF9fSMJkQ+4UU+G+py5781HPkpw4kaGwmJhGrzA/Lbhf4tL+XfynseLw42oygpfVabYEYRHSQx+1j5RpFSR6V9t4jlKsJu2xgYz0A96I82gIHItRRxZkT2oEsZCgYlgCiQsFcsFdo9N9bzDL9mVR5Nj0RPIVvKc01AVtKvXLx86g2rNPv45eBaJFrdsWmv97V8+Pv6M9d+Wr1qcTeT1BY8fvWUEDmU1HF6eCJ1A6cDAM+Nq4sAP9D2lH7D6rHwK+x07F56bMZibLeDoGKanE8PhhamhxBVemE/ByCoMoItBtSbpeBubHVsSHlGF3/AAKi6flY6j0htptgPOM8eOwGXx6YvVxu3KOMF+2RBIQai8LP0YEuhVJ0ST7WX5seeVSu5RMKUx/euHoQB6qID+ydzkXGzYZLTPPskmJSWqrboJQPIjZ/ruCtJepZ/+Lr7g5nCyb01w=='
    );
  }, []);

  const [camera, setCamera] = useState<Camera | null>(null);
  const [barcodeCaptureMode, setBarcodeCaptureMode] = useState<BarcodeCapture | null>(null);
  const [isBarcodeCaptureEnabled, setIsBarcodeCaptureEnabled] = useState(false);
  const [cameraState, setCameraState] = useState(FrameSourceState.Off);

  // Due to a React Native issue with firing the AppState 'change' event on iOS, we want to avoid triggering
  // a startCapture/stopCapture on the scanner twice in a row. We work around this by keeping track of the
  // latest command that was run, and skipping a repeated call for starting or stopping scanning.
  const lastCommand = useRef<string | null>(null);

  useEffect(() => {
    const handleAppStateChangeSubscription = AppState.addEventListener('change', handleAppStateChange);
    setupScanning();
    startCapture();
    return () => {
      handleAppStateChangeSubscription.remove();
      stopCapture();
      dataCaptureContext.dispose();
    }
  }, []);

  useEffect(() => {
    if (camera) {
      camera.switchToDesiredState(cameraState);
    }
  }, [cameraState]);

  useEffect(() => {
    if (barcodeCaptureMode) {
      barcodeCaptureMode.isEnabled = isBarcodeCaptureEnabled;
    }
  }, [isBarcodeCaptureEnabled]);

  const handleAppStateChange = async (nextAppState: AppStateStatus) => {
    if (nextAppState.match(/inactive|background/)) {
      stopCapture();
    } else {
      startCapture();
    }
  }

  const startCapture = () => {
    if (lastCommand.current === 'startCapture') {
      return;
    }
    lastCommand.current = 'startCapture';
    startCamera();
    setIsBarcodeCaptureEnabled(true);
  }

  const stopCapture = () => {
    if (lastCommand.current === 'stopCapture') {
      return;
    }
    lastCommand.current = 'stopCapture';
    setIsBarcodeCaptureEnabled(false);
    stopCamera();
  }

  const stopCamera = () => {
    setCameraState(FrameSourceState.Off);
  }

  const startCamera = () => {
    if (!camera) {
      // Use the world-facing (back) camera and set it as the frame source of the context. The camera is off by
      // default and must be turned on to start streaming frames to the data capture context for recognition.
      const cameraSettings = new CameraSettings();
      cameraSettings.preferredResolution = VideoResolution.FullHD;

      const defaultCamera = Camera.withSettings(cameraSettings);
      dataCaptureContext.setFrameSource(defaultCamera);
      setCamera(defaultCamera);
    }

    // Switch camera on to start streaming frames and enable the barcode capture mode.
    // The camera is started asynchronously and will take some time to completely turn on.
    requestCameraPermissionsIfNeeded()
      .then(() => setCameraState(FrameSourceState.On))
      .catch(() => BackHandler.exitApp());
  }

  const setupScanning = () => {
    // The barcode capturing process is configured through barcode capture settings
    // and are then applied to the barcode capture instance that manages barcode recognition.
    const settings = new BarcodeCaptureSettings();

    // The settings instance initially has all types of barcodes (symbologies) disabled. For the purpose of this
    // sample we enable the QR symbology. In your own app ensure that you only enable the symbologies that your app
    // requires as every additional enabled symbology has an impact on processing times.
    settings.enableSymbologies([Symbology.QR]);

    // Create new barcode capture mode with the settings from above.
    const barcodeCapture = BarcodeCapture.forContext(dataCaptureContext, settings);

    // By default, every time a barcode is scanned, a sound (if not in silent mode) and a vibration are played.
    // In the following we are setting a success feedback without sound and vibration.
    const feedback = BarcodeCaptureFeedback.default;
    feedback.success = new Feedback(null, null);
    barcodeCapture.feedback = feedback;

    // Register a listener to get informed whenever a new barcode got recognized.
    const barcodeCaptureListener = {
      didScan: (_: BarcodeCapture, session: BarcodeCaptureSession) => {
        const barcode = session.newlyRecognizedBarcodes[0];
        const symbology = new SymbologyDescription(barcode.symbology);

        // If the code scanned doesn't start with '09:', we will just ignore it and continue scanning.
        if (!barcode.data?.startsWith('09:')) {
          overlay.brush = Brush.transparent;
          return;
        }

        // Stop recognizing barcodes for as long as we are displaying the result. There won't be any
        // new results until the capture mode is enabled again. Note that disabling the capture mode
        // does not stop the camera, the camera continues to stream frames until it is turned off.
        setIsBarcodeCaptureEnabled(false);

        overlay.brush = new Brush(Color.fromHex('FFF0'), Color.fromHex('FFFF'), 3);

        Feedback.defaultFeedback.emit()

        Alert.alert(
          '',
          `Scanned: ${barcode.data} (${symbology.readableName})`,
          [{ text: 'OK', onPress: () => setIsBarcodeCaptureEnabled(true) }],
          { cancelable: false }
        );
      }
    };

    barcodeCapture.addListener(barcodeCaptureListener);

    // Add a barcode capture overlay to the data capture view to render the location of captured barcodes on top of
    // the video preview, using the Frame overlay style. This is optional, but recommended for better visual feedback.
    const overlay = BarcodeCaptureOverlay.withBarcodeCaptureForViewWithStyle(
        barcodeCapture,
        null,
        BarcodeCaptureOverlayStyle.Frame
    );

    overlay.brush = Brush.transparent;

    // Add a square viewfinder as we are only scanning square QR codes.
    overlay.viewfinder = new RectangularViewfinder(
        RectangularViewfinderStyle.Square,
        RectangularViewfinderLineStyle.Light,
    );

    viewRef.current?.addOverlay(overlay);

    setBarcodeCaptureMode(barcodeCapture);
  }

  return (
    <DataCaptureView style={{ flex: 1 }} context={dataCaptureContext} ref={viewRef} />
  );
}
