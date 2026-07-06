#!/bin/bash
# Post-install script: applies patch-package patches and manual fixes
# for nested node_modules that patch-package cannot handle.

set -e

# Apply standard patches (scandit CMakeLists fixes)
npx patch-package

# Fix expo-modules-core ReactStylesDiffMapBackingFieldAccessor for RN 0.78.x
# The method internal_backingMap() doesn't exist until RN 0.79+, so we use
# reflection with a fallback to the package-private mBackingMap field.
ACCESSOR_FILE="node_modules/expo/node_modules/expo-modules-core/android/src/main/java/com/facebook/react/uimanager/ReactStylesDiffMapBackingFieldAccessor.java"

if [ -f "$ACCESSOR_FILE" ]; then
  if grep -q "return diffMap.internal_backingMap();" "$ACCESSOR_FILE"; then
    cat > "$ACCESSOR_FILE" << 'EOF'
package com.facebook.react.uimanager;

import com.facebook.react.bridge.ReadableMap;

/**
 * Access the package private property declared inside of [ReactStylesDiffMap]
 */
public class ReactStylesDiffMapBackingFieldAccessor {
  static ReadableMap getBackingMap(ReactStylesDiffMap diffMap) {
    try {
      return (ReadableMap) ReactStylesDiffMap.class.getMethod("internal_backingMap").invoke(diffMap);
    } catch (Exception ignored) {
      return diffMap.mBackingMap;
    }
  }
}
EOF
    echo "expo-modules-core: patched ReactStylesDiffMapBackingFieldAccessor.java ✔"
  else
    echo "expo-modules-core: already patched ✔"
  fi
fi
