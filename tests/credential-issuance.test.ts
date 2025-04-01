// credential-issuance.test.ts
import { describe, it, expect, beforeEach } from "vitest"
import { mockBlockchain, mockPrincipal, mockBufferFromString } from "./test-utils"

describe("Credential Issuance Contract", () => {
  const admin = mockPrincipal("ST2JHG361ZXG51QTKY2NQCVBPPRRE2KZB1HR05NNC")
  const issuer1 = mockPrincipal("ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5")
  const issuer2 = mockPrincipal("ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG")
  const identityId = mockBufferFromString("identity123")
  const dataHash = mockBufferFromString("datahash123456789012345678901234567890")
  
  beforeEach(() => {
    mockBlockchain.reset()
    mockBlockchain.setCurrentPrincipal(admin)
    mockBlockchain.setBlockHeight(100)
  })
  
  it("should allow admin to register an issuer", () => {
    const result = mockBlockchain.callPublic("register-issuer", ["Government KYC"])
    expect(result.success).toBe(true)
    
    const issuer = mockBlockchain.callReadOnly("get-issuer", [admin])
    expect(issuer.result).not.toBeNull()
    expect(issuer.result.name).toBe("Government KYC")
    expect(issuer.result.active).toBe(true)
  })
  
  it("should not allow non-admin to register an issuer", () => {
    mockBlockchain.setCurrentPrincipal(issuer1)
    const result = mockBlockchain.callPublic("register-issuer", ["Fake Issuer"])
    expect(result.success).toBe(false)
    expect(result.error).toBe("u1") // ERR_UNAUTHORIZED
  })
  
  it("should allow admin to deactivate an issuer", () => {
    // Register issuer1
    mockBlockchain.setCurrentPrincipal(admin)
    mockBlockchain.callPublic("register-issuer", ["Government KYC"])
    
    // Register issuer1 as an issuer
    const registerResult = mockBlockchain.callPublic("register-issuer", ["Bank KYC"])
    expect(registerResult.success).toBe(true)
    
    // Deactivate issuer1
    const deactivateResult = mockBlockchain.callPublic("deactivate-issuer", [admin])
    expect(deactivateResult.success).toBe(true)
    
    // Verify issuer is deactivated
    const issuer = mockBlockchain.callReadOnly("get-issuer", [admin])
    expect(issuer.result.active).toBe(false)
  })
  
  it("should allow issuer to issue a credential", () => {
    // Register issuer1
    mockBlockchain.setCurrentPrincipal(admin)
    mockBlockchain.callPublic("register-issuer", ["Government KYC"])
    
    // Issue credential
    const expirationBlock = 1000 // Far in the future
    const issueResult = mockBlockchain.callPublic("issue-credential", [
      identityId,
      "kyc-basic",
      expirationBlock,
      dataHash,
    ])
    expect(issueResult.success).toBe(true)
    
    // Verify credential exists
    const credential = mockBlockchain.callReadOnly("get-credential", [identityId, "kyc-basic"])
    expect(credential.result).not.toBeNull()
    expect(credential.result.issuer).toBe(admin)
    expect(credential.result.revoked).toBe(false)
    expect(credential.result.expiration).toBe(expirationBlock)
  })
  
  it("should allow issuer to revoke their own credential", () => {
    // Register issuer1
    mockBlockchain.setCurrentPrincipal(admin)
    mockBlockchain.callPublic("register-issuer", ["Government KYC"])
    
    // Issue credential
    mockBlockchain.callPublic("issue-credential", [identityId, "kyc-basic", 1000, dataHash])
    
    // Revoke credential
    const revokeResult = mockBlockchain.callPublic("revoke-credential", [identityId, "kyc-basic"])
    expect(revokeResult.success).toBe(true)
    
    // Verify credential is revoked
    const credential = mockBlockchain.callReadOnly("get-credential", [identityId, "kyc-basic"])
    expect(credential.result.revoked).toBe(true)
  })
  
  it("should not allow unauthorized revocation of credentials", () => {
    // Register admin as issuer
    mockBlockchain.setCurrentPrincipal(admin)
    mockBlockchain.callPublic("register-issuer", ["Government KYC"])
    
    // Issue credential
    mockBlockchain.callPublic("issue-credential", [identityId, "kyc-basic", 1000, dataHash])
    
    // Try to revoke as different principal
    mockBlockchain.setCurrentPrincipal(issuer1)
    const revokeResult = mockBlockchain.callPublic("revoke-credential", [identityId, "kyc-basic"])
    expect(revokeResult.success).toBe(false)
    expect(revokeResult.error).toBe("u1") // ERR_UNAUTHORIZED
  })
  
  it("should correctly validate credentials", () => {
    // Register admin as issuer
    mockBlockchain.setCurrentPrincipal(admin)
    mockBlockchain.callPublic("register-issuer", ["Government KYC"])
    
    // Issue credential
    mockBlockchain.callPublic("issue-credential", [identityId, "kyc-basic", 1000, dataHash])
    
    // Validate credential
    const validResult = mockBlockchain.callReadOnly("is-valid-credential", [identityId, "kyc-basic"])
    expect(validResult.result).toBe(true)
    
    // Revoke credential
    mockBlockchain.callPublic("revoke-credential", [identityId, "kyc-basic"])
    
    // Validate revoked credential
    const invalidResult = mockBlockchain.callReadOnly("is-valid-credential", [identityId, "kyc-basic"])
    expect(invalidResult.result).toBe(false)
  })
})

