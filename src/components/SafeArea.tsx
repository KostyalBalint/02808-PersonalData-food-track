// SafeArea.tsx
import React from "react";
import Box, { BoxProps } from "@mui/material/Box"; // Import BoxProps for extending
import { Theme } from "@mui/material/styles"; // Import Theme for SxProps typing
import { SxProps } from "@mui/system"; // Import SxProps type

// Define the props interface using TypeScript
// Extend BoxProps to inherit standard attributes like className, id, etc.
// Omit 'sx' from BoxProps because we are defining it with specific structure
type SafeAreaProps = Omit<BoxProps, "sx"> & {
  children?: React.ReactNode; // Explicitly define children prop
  sx?: SxProps<Theme>; // Type the sx prop using MUI's SxProps and Theme
  disableTop?: boolean;
  disableRight?: boolean;
  disableBottom?: boolean;
  disableLeft?: boolean;
  defaultPadding?: string | number; // Fallback padding
  // 'component' prop is inherited from BoxProps and correctly typed via React.ElementType
};

/**
 * A component that applies padding to account for safe area insets
 * (like notches or home indicators) on mobile devices using MUI Box.
 * Requires `viewport-fit=cover` in the HTML meta tag.
 *
 * @param {SafeAreaProps} props - Component props.
 */
const SafeArea: React.FC<SafeAreaProps> = ({
  children,
  sx, // User-provided sx styles
  disableTop = false,
  disableRight = false,
  disableBottom = false,
  disableLeft = false,
  defaultPadding = "0px", // Default fallback padding
  component = "div", // Default underlying element
  ...otherProps // Spread the rest of the BoxProps (className, id, etc.)
}) => {
  // Base styles - ensure predictable container behavior
  // Type annotation helps clarity, though inference often works
  const baseSx: SxProps<Theme> = {
    width: "100%",
    height: "100%", // Common requirement for layout wrappers
    boxSizing: "border-box",
  };

  // Calculate safe area padding styles conditionally
  const safeAreaPaddingSx: SxProps<Theme> & {
    paddingTop?: string;
    paddingRight?: string;
    paddingBottom?: string;
    paddingLeft?: string;
  } = {}; // Explicit type for clarity
  const defaultPaddingValue =
    typeof defaultPadding === "number" ? `${defaultPadding}px` : defaultPadding; // Ensure fallback is a string for env()

  if (!disableTop) {
    safeAreaPaddingSx.paddingTop = `env(safe-area-inset-top, ${defaultPaddingValue})`;
  }
  if (!disableRight) {
    safeAreaPaddingSx.paddingRight = `env(safe-area-inset-right, ${defaultPaddingValue})`;
  }
  if (!disableBottom) {
    safeAreaPaddingSx.paddingBottom = `env(safe-area-inset-bottom, ${defaultPaddingValue})`;
  }
  if (!disableLeft) {
    safeAreaPaddingSx.paddingLeft = `env(safe-area-inset-left, ${defaultPaddingValue})`;
  }

  // Merge the sx props: base < safeArea < user's sx
  // Using array syntax is robust for merging sx props which might be objects, arrays, or functions
  const finalSx: SxProps<Theme> = [
    baseSx, // Apply base styles first
    safeAreaPaddingSx, // Apply calculated safe area padding
    ...(Array.isArray(sx) ? sx : [sx]), // Apply user's sx last (handles array/object)
  ];

  // Pass the final merged sx, component prop, and other props to the MUI Box
  return (
    <Box component={component} sx={finalSx} {...otherProps}>
      {children}
    </Box>
  );
};

// PropTypes are not needed/used in TypeScript projects, the interface handles type checking.

export default SafeArea;
