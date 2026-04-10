"use client";

import * as React from "react";
import { Drawer as VaulDrawer } from "vaul";

const DrawerRoot = ({
  shouldScaleBackground = true,
  ...props
}: React.ComponentProps<typeof VaulDrawer.Root>) => (
  <VaulDrawer.Root shouldScaleBackground={shouldScaleBackground} {...props} />
);

const DrawerTrigger = VaulDrawer.Trigger;

const DrawerPortal = VaulDrawer.Portal;

const DrawerClose = VaulDrawer.Close;

const DrawerOverlay = React.forwardRef<
  React.ElementRef<typeof VaulDrawer.Overlay>,
  React.ComponentPropsWithoutRef<typeof VaulDrawer.Overlay>
>(({ className, ...props }, ref) => (
  <VaulDrawer.Overlay
    ref={ref}
    className={`fixed inset-0 z-[60] bg-black/50 ${className ?? ""}`}
    {...props}
  />
));
DrawerOverlay.displayName = "DrawerOverlay";

const DrawerContent = React.forwardRef<
  React.ElementRef<typeof VaulDrawer.Content>,
  React.ComponentPropsWithoutRef<typeof VaulDrawer.Content> & {
    showHandle?: boolean;
  }
>(({ className, children, showHandle = true, ...props }, ref) => (
  <DrawerPortal>
    <DrawerOverlay />
    <VaulDrawer.Content
      ref={ref}
      className={`fixed bottom-0 left-0 right-0 z-[61] mx-auto flex max-h-[min(92vh,720px)] max-w-md flex-col rounded-t-3xl border border-zinc-200 bg-surface pb-[max(1rem,env(safe-area-inset-bottom))] outline-none ${className ?? ""}`}
      {...props}
    >
      {showHandle ? (
        <VaulDrawer.Handle className="mx-auto mt-3 mb-1 h-1.5 w-12 shrink-0 rounded-full bg-zinc-200" />
      ) : null}
      {children}
    </VaulDrawer.Content>
  </DrawerPortal>
));
DrawerContent.displayName = "DrawerContent";

export {
  DrawerRoot as Drawer,
  DrawerPortal,
  DrawerOverlay,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
};
