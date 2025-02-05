import connectorsClass from '@/helpers/connectors/index';
import { APP_NAME } from '@/helpers/constants';
import Eip6963 from '@/helpers/eip6963';
import { Connector, ConnectorType } from '@/networks/types';

type ConnectorDetail = Partial<
  Pick<Connector, 'id' | 'info' | 'options' | 'provider'>
>;

const eip6963 = new Eip6963();

eip6963.subscribe();
eip6963.requestProviders();

const injectedProviders = ref(eip6963.providerDetails);

const CONNECTOR_DETAILS: Record<ConnectorType, ConnectorDetail> = {
  injected: {},
  walletconnect: {
    info: {
      name: 'WalletConnect',
      icon: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAA0NpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDkuMS1jMDAyIDc5LmI3YzY0Y2NmOSwgMjAyNC8wNy8xNi0xMjozOTowNCAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIDI2LjAgKDIwMjQxMDAyLm0uMjc5NSA2YWJkNWNmKSAgKE1hY2ludG9zaCkiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6N0E2MDAwMjE3QkE3MTFFRkI1MzBDRTdGQTVGREUzNTkiIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6N0E2MDAwMjI3QkE3MTFFRkI1MzBDRTdGQTVGREUzNTkiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDo2NDZFN0VCODdCQTcxMUVGQjUzMENFN0ZBNUZERTM1OSIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDo3QTYwMDAyMDdCQTcxMUVGQjUzMENFN0ZBNUZERTM1OSIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFj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'
    },
    options: {
      projectId: 'e6454bd61aba40b786e866a69bd4c5c6',
      chains: [],
      optionalChains: [
        1, 10, 56, 100, 250, 4002, 8453, 42161, 137, 1088, 11155111
      ],
      optionalMethods: ['eth_sendTransaction', 'eth_signTypedData_v4'],
      showQrModal: true
    }
  },
  walletlink: {
    info: {
      name: 'Coinbase',
      icon: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAA0NpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDkuMS1jMDAyIDc5LmI3YzY0Y2NmOSwgMjAyNC8wNy8xNi0xMjozOTowNCAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIDI2LjAgKDIwMjQxMDAyLm0uMjc5NSA2YWJkNWNmKSAgKE1hY2ludG9zaCkiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6NTY1NUU3Nzk3QkE3MTFFRkI1MzBDRTdGQTVGREUzNTkiIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6NTY1NUU3N0E3QkE3MTFFRkI1MzBDRTdGQTVGREUzNTkiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDo1NjU1RTc3NzdCQTcxMUVGQjUzMENFN0ZBNUZERTM1OSIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDo1NjU1RTc3ODdCQTcxMUVGQjUzMENFN0ZBNUZERTM1OSIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFj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'
    },
    options: {
      appName: APP_NAME,
      darkMode: false,
      chainId: 1,
      ethJsonrpcUrl: 'https://cloudflare-eth.com'
    }
  },
  gnosis: {
    info: {
      name: 'Gnosis Safe',
      icon: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAA0NpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDkuMS1jMDAyIDc5LmI3YzY0Y2NmOSwgMjAyNC8wNy8xNi0xMjozOTowNCAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIDI2LjAgKDIwMjQxMDAyLm0uMjc5NSA2YWJkNWNmKSAgKE1hY2ludG9zaCkiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6NTY1NUU3N0Q3QkE3MTFFRkI1MzBDRTdGQTVGREUzNTkiIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6NTY1NUU3N0U3QkE3MTFFRkI1MzBDRTdGQTVGREUzNTkiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDo1NjU1RTc3QjdCQTcxMUVGQjUzMENFN0ZBNUZERTM1OSIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDo1NjU1RTc3QzdCQTcxMUVGQjUzMENFN0ZBNUZERTM1OSIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFj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'
    }
  },
  argentx: {
    info: {
      name: 'Starknet',
      icon: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAA0NpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDkuMS1jMDAyIDc5LmI3YzY0Y2NmOSwgMjAyNC8wNy8xNi0xMjozOTowNCAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIDI2LjAgKDIwMjQxMDAyLm0uMjc5NSA2YWJkNWNmKSAgKE1hY2ludG9zaCkiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6NjQ2RTdFQjY3QkE3MTFFRkI1MzBDRTdGQTVGREUzNTkiIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6NjQ2RTdFQjc3QkE3MTFFRkI1MzBDRTdGQTVGREUzNTkiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDo2NDZFN0VCNDdCQTcxMUVGQjUzMENFN0ZBNUZERTM1OSIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDo2NDZFN0VCNTdCQTcxMUVGQjUzMENFN0ZBNUZERTM1OSIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFj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'
    },
    options: {
      dappName: APP_NAME,
      argentMobileOptions: {
        dappName: APP_NAME,
        url: 'https://snapshot.box',
        icons: ['https://snapshot.box/favicon.svg']
      }
    }
  },
  'sequence-waas': {
    info: {
      name: 'Sequence Embedded Wallet',
      icon: 'data:image/svg+xml;base64,CjxzdmcgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB3aWR0aD0iNDkiIGhlaWdodD0iMzkiIHZpZXdCb3g9IjAgMCA0OSAzOSIgZmlsbD0ibm9uZSI+CiAgPGcgY2xpcFBhdGg9InVybCgjY2xpcDBfMTkzXzI2NDU0KSI+CiAgICA8cGF0aCBkPSJNMC45Nzg1MTYgOC4wODc2NEwwLjk3ODUxNiAyOS45NzEyQzAuOTc4NTE2IDM0LjQzNzcgNC41OTkzNyAzOC4wNTg2IDkuMDY1OTIgMzguMDU4Nkg0MC40NjQxQzQ0LjkzMDYgMzguMDU4NiA0OC41NTE1IDM0LjQzNzcgNDguNTUxNSAyOS45NzEyVjguMDg3NjRDNDguNTUxNSAzLjYyMTEgNDQuOTMwNiAwLjAwMDI0NDE0MSA0MC40NjQxIDAuMDAwMjQ0MTQxSDkuMDY1OTJDNC41OTkzNyAwLjAwMDI0NDE0MSAwLjk3ODUxNiAzLjYyMTEgMC45Nzg1MTYgOC4wODc2NFoiIGZpbGw9IiMxMTExMTEiLz4KICAgIDxwYXRoIGQ9Ik0wLjk3ODUxNiA4LjA4NzY0TDAuOTc4NTE2IDI5Ljk3MTJDMC45Nzg1MTYgMzQuNDM3NyA0LjU5OTM3IDM4LjA1ODYgOS4wNjU5MiAzOC4wNTg2SDQwLjQ2NDFDNDQuOTMwNiAzOC4wNTg2IDQ4LjU1MTUgMzQuNDM3NyA0OC41NTE1IDI5Ljk3MTJWOC4wODc2NEM0OC41NTE1IDMuNjIxMSA0NC45MzA2IDAuMDAwMjQ0MTQxIDQwLjQ2NDEgMC4wMDAyNDQxNDFIOS4wNjU5MkM0LjU5OTM3IDAuMDAwMjQ0MTQxIDAuOTc4NTE2IDMuNjIxMSAwLjk3ODUxNiA4LjA4NzY0WiIgZmlsbD0idXJsKCNwYWludDBfbGluZWFyXzE5M18yNjQ1NCkiLz4KICAgIDxwYXRoIGQ9Ik0xMi44NzIgOS41MTQzOUMxMi44NzIgOC4yMDA3IDExLjgwNzEgNy4xMzU3NCAxMC40OTM0IDcuMTM1NzRDOS4xNzk3IDcuMTM1NzQgOC4xMTQ3NSA4LjIwMDcgOC4xMTQ3NSA5LjUxNDM5QzguMTE0NzUgMTAuODI4MSA5LjE3OTcgMTEuODkzIDEwLjQ5MzQgMTEuODkzQzExLjgwNzEgMTEuODkzIDEyLjg3MiAxMC44MjgxIDEyLjg3MiA5LjUxNDM5WiIgZmlsbD0idXJsKCNwYWludDFfbGluZWFyXzE5M18yNjQ1NCkiLz4KICAgIDxwYXRoIGQ9Ik0xMi44NzIgOS41MTQzOUMxMi44NzIgOC4yMDA3IDExLjgwNzEgNy4xMzU3NCAxMC40OTM0IDcuMTM1NzRDOS4xNzk3IDcuMTM1NzQgOC4xMTQ3NSA4LjIwMDcgOC4xMTQ3NSA5LjUxNDM5QzguMTE0NzUgMTAuODI4MSA5LjE3OTcgMTEuODkzIDEwLjQ5MzQgMTEuODkzQzExLjgwNzEgMTEuODkzIDEyLjg3MiAxMC44MjgxIDEyLjg3MiA5LjUxNDM5WiIgZmlsbD0idXJsKCNwYWludDJfbGluZWFyXzE5M18yNjQ1NCkiLz4KICAgIDxwYXRoIGQ9Ik0xMi44NzIgOS41MTQzOUMxMi44NzIgOC4yMDA3IDExLjgwNzEgNy4xMzU3NCAxMC40OTM0IDcuMTM1NzRDOS4xNzk3IDcuMTM1NzQgOC4xMTQ3NSA4LjIwMDcgOC4xMTQ3NSA5LjUxNDM5QzguMTE0NzUgMTAuODI4MSA5LjE3OTcgMTEuODkzIDEwLjQ5MzQgMTEuODkzQzExLjgwNzEgMTEuODkzIDEyLjg3MiAxMC44MjgxIDEyLjg3MiA5LjUxNDM5WiIgZmlsbD0idXJsKCNwYWludDNfbGluZWFyXzE5M18yNjQ1NCkiLz4KICAgIDxwYXRoIGQ9Ik0xMi44NzIgMjguNTI4MUMxMi44NzIgMjcuMjE0NCAxMS44MDcxIDI2LjE0OTQgMTAuNDkzNCAyNi4xNDk0QzkuMTc5NyAyNi4xNDk0IDguMTE0NzUgMjcuMjE0NCA4LjExNDc1IDI4LjUyODFDOC4xMTQ3NSAyOS44NDE4IDkuMTc5NyAzMC45MDY3IDEwLjQ5MzQgMzAuOTA2N0MxMS44MDcxIDMwLjkwNjcgMTIuODcyIDI5Ljg0MTggMTIuODcyIDI4LjUyODFaIiBmaWxsPSJ1cmwoI3BhaW50NF9saW5lYXJfMTkzXzI2NDU0KSIvPgogICAgPHBhdGggZD0iTTQxLjQxNTUgMTkuMDI5NUM0MS40MTU1IDE3LjcxNTggNDAuMzUwNSAxNi42NTA5IDM5LjAzNjggMTYuNjUwOUMzNy43MjMyIDE2LjY1MDkgMzYuNjU4MiAxNy43MTU4IDM2LjY1ODIgMTkuMDI5NUMzNi42NTgyIDIwLjM0MzIgMzcuNzIzMiAyMS40MDgyIDM5LjAzNjggMjEuNDA4MkM0MC4zNTA1IDIxLjQwODIgNDEuNDE1NSAyMC4zNDMyIDQxLjQxNTUgMTkuMDI5NVoiIGZpbGw9InVybCgjcGFpbnQ1X2xpbmVhcl8xOTNfMjY0NTQpIi8+CiAgICA8cGF0aCBkPSJNNDEuNDE1NSAxOS4wMjk1QzQxLjQxNTUgMTcuNzE1OCA0MC4zNTA1IDE2LjY1MDkgMzkuMDM2OCAxNi42NTA5QzM3LjcyMzIgMTYuNjUwOSAzNi42NTgyIDE3LjcxNTggMzYuNjU4MiAxOS4wMjk1QzM2LjY1ODIgMjAuMzQzMiAzNy43MjMyIDIxLjQwODIgMzkuMDM2OCAyMS40MDgyQzQwLjM1MDUgMjEuNDA4MiA0MS40MTU1IDIwLjM0MzIgNDEuNDE1NSAxOS4wMjk1WiIgZmlsbD0idXJsKCNwYWludDZfbGluZWFyXzE5M18yNjQ1NCkiLz4KICAgIDxwYXRoIGQ9Ik0zOS4wMzY3IDcuMTM1NzRIMjAuMDA3NkMxOC42OTM5IDcuMTM1NzQgMTcuNjI4OSA4LjIwMDcgMTcuNjI4OSA5LjUxNDM5QzE3LjYyODkgMTAuODI4MSAxOC42OTM5IDExLjg5MyAyMC4wMDc2IDExLjg5M0gzOS4wMzY3QzQwLjM1MDQgMTEuODkzIDQxLjQxNTQgMTAuODI4MSA0MS40MTU0IDkuNTE0MzlDNDEuNDE1NCA4LjIwMDcgNDAuMzUwNCA3LjEzNTc0IDM5LjAzNjcgNy4xMzU3NFoiIGZpbGw9InVybCgjcGFpbnQ3X2xpbmVhcl8xOTNfMjY0NTQpIi8+CiAgICA8cGF0aCBkPSJNMzkuMDM2NyAyNi4xNDk0SDIwLjAwNzZDMTguNjkzOSAyNi4xNDk0IDE3LjYyODkgMjcuMjE0NCAxNy42Mjg5IDI4LjUyODFDMTcuNjI4OSAyOS44NDE4IDE4LjY5MzkgMzAuOTA2NyAyMC4wMDc2IDMwLjkwNjdIMzkuMDM2N0M0MC4zNTA0IDMwLjkwNjcgNDEuNDE1NCAyOS44NDE4IDQxLjQxNTQgMjguNTI4MUM0MS40MTU0IDI3LjIxNDQgNDAuMzUwNCAyNi4xNDk0IDM5LjAzNjcgMjYuMTQ5NFoiIGZpbGw9InVybCgjcGFpbnQ4X2xpbmVhcl8xOTNfMjY0NTQpIi8+CiAgICA8cGF0aCBkPSJNMjkuNTIyNiAxNi42NTA5SDEwLjQ5MzRDOS4xNzk3IDE2LjY1MDkgOC4xMTQ3NSAxNy43MTU4IDguMTE0NzUgMTkuMDI5NUM4LjExNDc1IDIwLjM0MzIgOS4xNzk3IDIxLjQwODIgMTAuNDkzNCAyMS40MDgySDI5LjUyMjZDMzAuODM2MyAyMS40MDgyIDMxLjkwMTIgMjAuMzQzMiAzMS45MDEyIDE5LjAyOTVDMzEuOTAxMiAxNy43MTU4IDMwLjgzNjMgMTYuNjUwOSAyOS41MjI2IDE2LjY1MDlaIiBmaWxsPSJ1cmwoI3BhaW50OV9saW5lYXJfMTkzXzI2NDU0KSIvPgogIDwvZz4KICA8ZGVmcz4KICAgIDxsaW5lYXJHcmFkaWVudCBpZD0icGFpbnQwX2xpbmVhcl8xOTNfMjY0NTQiIHgxPSIyNC43NjUiIHkxPSIwLjAwMDI0OTAwMyIgeDI9IjI0Ljc2NSIgeTI9IjM4LjA5ODEiIGdyYWRpZW50VW5pdHM9InVzZXJTcGFjZU9uVXNlIj4KICAgICAgPHN0b3Agc3RvcC1jb2xvcj0iIzFEMjczRCIvPgogICAgICA8c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiMwRDBGMTMiLz4KICAgIDwvbGluZWFyR3JhZGllbnQ+CiAgICA8bGluZWFyR3JhZGllbnQgaWQ9InBhaW50MV9saW5lYXJfMTkzXzI2NDU0IiB4MT0iOC44NDc1NyIgeTE9IjExLjg2MDUiIHgyPSIxMi4wNzk4IiB5Mj0iNy41Mzg5OCIgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiPgogICAgICA8c3RvcCBzdG9wLWNvbG9yPSIjNDQ2MkZFIi8+CiAgICAgIDxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzdENjlGQSIvPgogICAgPC9saW5lYXJHcmFkaWVudD4KICAgIDxsaW5lYXJHcmFkaWVudCBpZD0icGFpbnQyX2xpbmVhcl8xOTNfMjY0NTQiIHgxPSI4LjUzMjgxIiB5MT0iMTEuODk1MyIgeDI9IjEyLjUyODEiIHkyPSIxMS42OTA1IiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+CiAgICAgIDxzdG9wIHN0b3AtY29sb3I9IiMzNzU3RkQiLz4KICAgICAgPHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjNjk4MEZBIi8+CiAgICA8L2xpbmVhckdyYWRpZW50PgogICAgPGxpbmVhckdyYWRpZW50IGlkPSJwYWludDNfbGluZWFyXzE5M18yNjQ1NCIgeDE9IjguNTMyODEiIHkxPSIxMS44OTUzIiB4Mj0iMTIuNTI4MSIgeTI9IjExLjY5MDUiIGdyYWRpZW50VW5pdHM9InVzZXJTcGFjZU9uVXNlIj4KICAgICAgPHN0b3Agc3RvcC1jb2xvcj0iIzI0NDdGRiIvPgogICAgICA8c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiM2OTgwRkEiLz4KICAgIDwvbGluZWFyR3JhZGllbnQ+CiAgICA8bGluZWFyR3JhZGllbnQgaWQ9InBhaW50NF9saW5lYXJfMTkzXzI2NDU0IiB4MT0iOC43ODc1MSIgeTE9IjMwLjEzMDMiIHgyPSIxMS45NjE4IiB5Mj0iMjYuNzY3MSIgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiPgogICAgICA8c3RvcCBzdG9wLWNvbG9yPSIjQkMzRUU2Ii8+CiAgICAgIDxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iI0Q5NzJGMSIvPgogICAgPC9saW5lYXJHcmFkaWVudD4KICAgIDxsaW5lYXJHcmFkaWVudCBpZD0icGFpbnQ1X2xpbmVhcl8xOTNfMjY0NTQiIHgxPSIzNy42MTkzIiB5MT0iMjAuNjA2NyIgeDI9IjQwLjU1NCIgeTI9IjE3LjQ4MzgiIGdyYWRpZW50VW5pdHM9InVzZXJTcGFjZU9uVXNlIj4KICAgICAgPHN0b3Agc3RvcC1jb2xvcj0iIzI5QkRGRiIvPgogICAgICA8c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiM5NkU3RkIiLz4KICAgIDwvbGluZWFyR3JhZGllbnQ+CiAgICA8bGluZWFyR3JhZGllbnQgaWQ9InBhaW50Nl9saW5lYXJfMTkzXzI2NDU0IiB4MT0iMzcuMDQwMiIgeTE9IjIxLjM3NTYiIHgyPSI0MS4xNzEzIiB5Mj0iMjEuMTc3NCIgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiPgogICAgICA8c3RvcCBzdG9wLWNvbG9yPSIjMjNCQkZGIi8+CiAgICAgIDxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzg1RTdGRiIvPgogICAgPC9saW5lYXJHcmFkaWVudD4KICAgIDxsaW5lYXJHcmFkaWVudCBpZD0icGFpbnQ3X2xpbmVhcl8xOTNfMjY0NTQiIHgxPSIxOS41MzkiIHkxPSIxMS44NjA1IiB4Mj0iMzkuMTE1IiB5Mj0iNy4xNjM3NyIgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiPgogICAgICA8c3RvcCBzdG9wLWNvbG9yPSIjMjNCQkZGIi8+CiAgICAgIDxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzg1RTdGRiIvPgogICAgPC9saW5lYXJHcmFkaWVudD4KICAgIDxsaW5lYXJHcmFkaWVudCBpZD0icGFpbnQ4X2xpbmVhcl8xOTNfMjY0NTQiIHgxPSIxOS43MTkyIiB5MT0iMzAuOTA5IiB4Mj0iMzguNTEzOCIgeTI9IjI2LjA5MjEiIGdyYWRpZW50VW5pdHM9InVzZXJTcGFjZU9uVXNlIj4KICAgICAgPHN0b3Agc3RvcC1jb2xvcj0iIzI0NDdGRiIvPgogICAgICA8c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiM2OTgwRkEiLz4KICAgIDwvbGluZWFyR3JhZGllbnQ+CiAgICA8bGluZWFyR3JhZGllbnQgaWQ9InBhaW50OV9saW5lYXJfMTkzXzI2NDU0IiB4MT0iMTEuMzEwMyIgeTE9IjIxLjQ0NTQiIHgyPSIyOS4yNjM3IiB5Mj0iMTYuNjI4NiIgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiPgogICAgICA8c3RvcCBzdG9wLWNvbG9yPSIjNjYzNEZGIi8+CiAgICAgIDxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzlDNkRGRiIvPgogICAgPC9saW5lYXJHcmFkaWVudD4KICAgIDxjbGlwUGF0aCBpZD0iY2xpcDBfMTkzXzI2NDU0Ij4KICAgICAgPHJlY3Qgd2lkdGg9IjQ3LjU3MjkiIGhlaWdodD0iMzguMDU4MyIgZmlsbD0id2hpdGUiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDAuOTc4NTE2KSIvPgogICAgPC9jbGlwUGF0aD4KICA8L2RlZnM+Cjwvc3ZnPg=='
    },
    options: {
      app: APP_NAME
    }
  }
} as const;

export function useConnectors() {
  function getConnectors(
    connectorType: ConnectorType,
    connector: ConnectorDetail
  ) {
    return connectorType === 'injected'
      ? Array.from(injectedProviders.value.entries()).map(([id, detail]) => ({
          ...detail,
          id
        }))
      : [connector];
  }

  const connectors = computed<Connector[]>(() => {
    return (
      Object.entries(CONNECTOR_DETAILS) as [ConnectorType, ConnectorDetail][]
    ).flatMap(([type, detail]) => {
      return getConnectors(type, detail).map(
        d =>
          new connectorsClass[type](
            d.id || type,
            type,
            d.info,
            d.options,
            d.provider
          )
      );
    });
  });

  return { connectors };
}
