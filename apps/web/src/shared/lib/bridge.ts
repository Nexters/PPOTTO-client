'use client';

import { contract } from '@ppotto/bridge';
import { createBridgeClient } from 'webview-bridge-kit/react';

export const { BridgeProvider, useBridge, useBridgeEvent } = createBridgeClient(contract);
