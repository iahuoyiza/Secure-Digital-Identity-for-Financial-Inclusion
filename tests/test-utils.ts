// test-utils.ts
// Mock utilities for testing Clarity contracts with Vitest

export const mockPrincipal = (address: string) => {
  return address
}

export const mockBufferFromString = (str: string) => {
  // In a real implementation, this would convert a string to a buffer
  // For testing purposes, we'll just return the string
  return str
}

// Simple mock blockchain for testing
export const mockBlockchain = {
  state: {
    currentPrincipal: "",
    blockHeight: 0,
    dataStore: new Map(),
    contractCalls: [],
  },

  reset() {
    this.state.currentPrincipal = ""
    this.state.blockHeight = 0
    this.state.dataStore = new Map()
    this.state.contractCalls = []
  },

  setCurrentPrincipal(principal: string) {
    this.state.currentPrincipal = principal
  },

  setBlockHeight(height: number) {
    this.state.blockHeight = height
  },

  callPublic(functionName: string, args: any[]) {
    this.state.contractCalls.push({ function: functionName, args, caller: this.state.currentPrincipal })

    // This would actually call the contract function in a real implementation
    // For testing, we'll return a mock result based on the function name and args
    return {
      success: true,
      result: null,
    }
  },

  callReadOnly(functionName: string, args: any[]) {
    // This would actually call the contract function in a real implementation
    // For testing, we'll return a mock result based on the function name and args
    return {
      result: {},
    }
  },

  callPrivate(functionName: string, args: any[]) {
    // This would actually call the contract function in a real implementation
    // For testing, we'll return a mock result based on the function name and args
    return {
      result: "",
    }
  },
}

