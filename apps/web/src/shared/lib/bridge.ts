'use client';

import { contract } from '@gallery/bridge';
import { createBridgeClient } from 'webview-bridge-kit/react';

export const { BridgeProvider, useBridge, useBridgeEvent } = createBridgeClient(contract);
