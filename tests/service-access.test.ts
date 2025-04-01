// service-access.test.ts
import { describe, it, expect, beforeEach } from "vitest"
import { mockBlockchain, mockPrincipal, mockBufferFromString } from "./test-utils"

describe("Service Access Contract", () => {
  const admin = mockPrincipal("ST2JHG361ZXG51QTKY2NQCVBPPRRE2KZB1HR05NNC")
  const provider1 = mockPrincipal("ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5")
  const provider2 = mockPrincipal("ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG")
  const user = mockPrincipal("ST3AM1A56AK2C1XAFJ4115ZSV26EB49BVQ10MGCS0")
  const identityId = mockBufferFromString("identity123")
  
  beforeEach(() => {
    mockBlockchain.reset()
    mockBlockchain.setCurrentPrincipal(admin)
    mockBlockchain.setBlockHeight(100)
  })
  
  it("should allow admin to register a service provider", () => {
    const serviceTypes = ["savings", "loans", "payments"]
    const result = mockBlockchain.callPublic("register-service-provider", ["MicroBank", serviceTypes])
    expect(result.success).toBe(true)
    
    const provider = mockBlockchain.callReadOnly("get-service-provider", [admin])
    expect(provider.result).not.toBeNull()
    expect(provider.result.name).toBe("MicroBank")
    expect(provider.result.active).toBe(true)
    expect(provider.result["service-types"]).toEqual(serviceTypes)
  })
  
  it("should not allow non-admin to register a service provider", () => {
    mockBlockchain.setCurrentPrincipal(provider1)
    const serviceTypes = ["savings", "loans"]
    const result = mockBlockchain.callPublic("register-service-provider", ["FakeBank", serviceTypes])
    expect(result.success).toBe(false)
    expect(result.error).toBe("u1") // ERR_UNAUTHORIZED
  })
  
  it("should allow admin to deactivate a service provider", () => {
    // Register provider1
    mockBlockchain.setCurrentPrincipal(admin)
    const serviceTypes = ["savings", "loans"]
    mockBlockchain.callPublic("register-service-provider", ["MicroBank", serviceTypes])
    
    // Deactivate provider1
    const deactivateResult = mockBlockchain.callPublic("deactivate-service-provider", [admin])
    expect(deactivateResult.success).toBe(true)
    
    // Verify provider is deactivated
    const provider = mockBlockchain.callReadOnly("get-service-provider", [admin])
    expect(provider.result.active).toBe(false)
  })
  
  it("should allow provider to set service requirements", () => {
    // Register provider
    mockBlockchain.setCurrentPrincipal(admin)
    const serviceTypes = ["savings", "loans"]
    mockBlockchain.callPublic("register-service-provider", ["MicroBank", serviceTypes])
    
    // Set requirements for savings service
    const requiredCredentials = ["kyc-basic", "address-verification"]
    const minTxCount = 5
    const minTxVolume = 1000
    const setRequirementsResult = mockBlockchain.callPublic("set-service-requirements", [
      "savings",
      requiredCredentials,
      minTxCount, // min-tx-count
      minTxVolume, // min-tx-volume
    ])
    expect(setRequirementsResult.success).toBe(true)
    
    // Verify requirements
    const requirements = mockBlockchain.callReadOnly("get-service-requirements", [admin, "savings"])
    expect(requirements.result).not.toBeNull()
    expect(requirements.result["required-credentials"]).toEqual(requiredCredentials)
    expect(requirements.result["min-tx-count"]).toBe(minTxCount)
    expect(requirements.result["min-tx-volume"]).toBe(minTxVolume)
  })
  
  it("should allow user to request service access", () => {
    // Register provider
    mockBlockchain.setCurrentPrincipal(admin)
    const serviceTypes = ["savings", "loans"]
    mockBlockchain.callPublic("register-service-provider", ["MicroBank", serviceTypes])
    
    // Set requirements for savings service
    const requiredCredentials = ["kyc-basic", "address-verification"]
    const minTxCount = 5
    const minTxVolume = 1000
    mockBlockchain.callPublic("set-service-requirements", [
      "savings",
      requiredCredentials,
      minTxCount, // min-tx-count
      minTxVolume, // min-tx-volume
    ])
    
    // Request access
    mockBlockchain.setCurrentPrincipal(user)
    const requestResult = mockBlockchain.callPublic("request-service-access", [identityId, admin, "savings"])
    expect(requestResult.success).toBe(true)
    
    // Verify access was granted
    const access = mockBlockchain.callReadOnly("get-service-access", [identityId, admin, "savings"])
    expect(access.result).not.toBeNull()
    expect(access.result.active).toBe(true)
    expect(access.result["granted-at"]).toBe(100) // Current block height
  })
  
  it("should allow provider to revoke service access", () => {
    // Register provider
    mockBlockchain.setCurrentPrincipal(admin)
    const serviceTypes = ["savings", "loans"]
    mockBlockchain.callPublic("register-service-provider", ["MicroBank", serviceTypes])
    
    // Set requirements for savings service
    const requiredCredentials = ["kyc-basic"]
    const minTxCount = 0
    const minTxVolume = 0
    mockBlockchain.callPublic("set-service-requirements", ["savings", requiredCredentials, minTxCount, minTxVolume])
    
    // Request access
    mockBlockchain.setCurrentPrincipal(user)
    mockBlockchain.callPublic("request-service-access", [identityId, admin, "savings"])
    
    // Revoke access
    mockBlockchain.setCurrentPrincipal(admin)
    const revokeResult = mockBlockchain.callPublic("revoke-service-access", [identityId, "savings"])
    expect(revokeResult.success).toBe(true)
    
    // Verify access was revoked
    const access = mockBlockchain.callReadOnly("get-service-access", [identityId, admin, "savings"])
    expect(access.result.active).toBe(false)
  })
})

