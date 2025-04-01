// identity-creation.test.ts
import { describe, it, expect, beforeEach } from "vitest"
import { mockBlockchain, mockPrincipal } from "./test-utils"

describe("Identity Creation Contract", () => {
  const user1 = mockPrincipal("ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5")
  const user2 = mockPrincipal("ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG")
  const admin = mockPrincipal("ST2JHG361ZXG51QTKY2NQCVBPPRRE2KZB1HR05NNC")
  
  beforeEach(() => {
    mockBlockchain.reset()
    mockBlockchain.setCurrentPrincipal(admin)
  })
  
  it("should allow a user to create an identity", () => {
    mockBlockchain.setCurrentPrincipal(user1)
    const result = mockBlockchain.callPublic("create-identity", [])
    expect(result.success).toBe(true)
    
    // Verify identity exists
    const identityId = mockBlockchain.callPrivate("generate-id", [user1])
    const identity = mockBlockchain.callReadOnly("get-identity", [identityId.result])
    
    expect(identity.result).not.toBeNull()
    expect(identity.result.owner).toBe(user1)
    expect(identity.result.active).toBe(true)
  })
  
  it("should not allow creating duplicate identities", () => {
    mockBlockchain.setCurrentPrincipal(user1)
    
    // First creation should succeed
    const result1 = mockBlockchain.callPublic("create-identity", [])
    expect(result1.success).toBe(true)
    
    // Second creation should fail
    const result2 = mockBlockchain.callPublic("create-identity", [])
    expect(result2.success).toBe(false)
    expect(result2.error).toBe("u2") // ERR_ALREADY_EXISTS
  })
  
  it("should allow deactivating an identity by owner", () => {
    mockBlockchain.setCurrentPrincipal(user1)
    
    // Create identity
    mockBlockchain.callPublic("create-identity", [])
    const identityId = mockBlockchain.callPrivate("generate-id", [user1])
    
    // Deactivate identity
    const result = mockBlockchain.callPublic("deactivate-identity", [identityId.result])
    expect(result.success).toBe(true)
    
    // Verify identity is deactivated
    const identity = mockBlockchain.callReadOnly("get-identity", [identityId.result])
    expect(identity.result.active).toBe(false)
  })
  
  it("should allow admin to deactivate any identity", () => {
    // User creates identity
    mockBlockchain.setCurrentPrincipal(user1)
    mockBlockchain.callPublic("create-identity", [])
    const identityId = mockBlockchain.callPrivate("generate-id", [user1])
    
    // Admin deactivates it
    mockBlockchain.setCurrentPrincipal(admin)
    const result = mockBlockchain.callPublic("deactivate-identity", [identityId.result])
    expect(result.success).toBe(true)
    
    // Verify identity is deactivated
    const identity = mockBlockchain.callReadOnly("get-identity", [identityId.result])
    expect(identity.result.active).toBe(false)
  })
  
  it("should not allow unauthorized deactivation", () => {
    // User1 creates identity
    mockBlockchain.setCurrentPrincipal(user1)
    mockBlockchain.callPublic("create-identity", [])
    const identityId = mockBlockchain.callPrivate("generate-id", [user1])
    
    // User2 tries to deactivate it
    mockBlockchain.setCurrentPrincipal(user2)
    const result = mockBlockchain.callPublic("deactivate-identity", [identityId.result])
    expect(result.success).toBe(false)
    expect(result.error).toBe("u1") // ERR_UNAUTHORIZED
  })
})

