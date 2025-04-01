;; credential-issuance.clar
;; This contract handles the issuance and verification of identity credentials

;; Define data variables
(define-data-var admin principal tx-sender)
(define-map issuers
  { issuer: principal }
  {
    name: (string-utf8 50),
    active: bool,
    registered-at: uint
  }
)

(define-map credentials
  {
    identity-owner: principal,
    credential-type: (string-utf8 30)
  }
  {
    issuer: principal,
    issued-at: uint,
    expiration: uint,
    revoked: bool,
    data-hash: (string-utf8 64)
  }
)

;; Error codes
(define-constant ERR_UNAUTHORIZED u1)
(define-constant ERR_ALREADY_EXISTS u2)
(define-constant ERR_NOT_FOUND u3)
(define-constant ERR_EXPIRED u4)
(define-constant ERR_REVOKED u5)
(define-constant ERR_INACTIVE_ISSUER u6)

;; Read-only functions
(define-read-only (get-credential (identity-owner principal) (credential-type (string-utf8 30)))
  (map-get? credentials { identity-owner: identity-owner, credential-type: credential-type })
)

(define-read-only (get-issuer (issuer principal))
  (map-get? issuers { issuer: issuer })
)

(define-read-only (is-admin)
  (is-eq tx-sender (var-get admin))
)

(define-read-only (is-valid-credential (identity-owner principal) (credential-type (string-utf8 30)))
  (let
    (
      (credential (map-get? credentials { identity-owner: identity-owner, credential-type: credential-type }))
    )
    (and
      (is-some credential)
      (let
        (
          (unwrapped-credential (unwrap! credential false))
          (issuer-info (map-get? issuers { issuer: (get issuer unwrapped-credential) }))
        )
        (and
          (is-some issuer-info)
          (get active (unwrap! issuer-info false))
          (not (get revoked unwrapped-credential))
          (> (get expiration unwrapped-credential) block-height)
        )
      )
    )
  )
)

;; Public functions
(define-public (register-issuer (name (string-utf8 50)))
  (begin
    (asserts! (is-admin) (err ERR_UNAUTHORIZED))
    (asserts! (is-none (get-issuer tx-sender)) (err ERR_ALREADY_EXISTS))
    (ok (map-insert issuers
      { issuer: tx-sender }
      {
        name: name,
        active: true,
        registered-at: block-height
      }
    ))
  )
)

(define-public (deactivate-issuer (issuer principal))
  (begin
    (asserts! (is-admin) (err ERR_UNAUTHORIZED))
    (let
      (
        (issuer-info (unwrap! (get-issuer issuer) (err ERR_NOT_FOUND)))
      )
      (ok (map-set issuers
        { issuer: issuer }
        (merge issuer-info { active: false })
      ))
    )
  )
)

(define-public (reactivate-issuer (issuer principal))
  (begin
    (asserts! (is-admin) (err ERR_UNAUTHORIZED))
    (let
      (
        (issuer-info (unwrap! (get-issuer issuer) (err ERR_NOT_FOUND)))
      )
      (ok (map-set issuers
        { issuer: issuer }
        (merge issuer-info { active: true })
      ))
    )
  )
)

(define-public (issue-credential
  (identity-owner principal)
  (credential-type (string-utf8 30))
  (expiration uint)
  (data-hash (string-utf8 64))
)
  (let
    (
      (issuer-info (unwrap! (get-issuer tx-sender) (err ERR_NOT_FOUND)))
    )
    (asserts! (get active issuer-info) (err ERR_INACTIVE_ISSUER))
    (asserts! (is-none (get-credential identity-owner credential-type)) (err ERR_ALREADY_EXISTS))
    (asserts! (> expiration block-height) (err ERR_EXPIRED))

    (ok (map-insert credentials
      {
        identity-owner: identity-owner,
        credential-type: credential-type
      }
      {
        issuer: tx-sender,
        issued-at: block-height,
        expiration: expiration,
        revoked: false,
        data-hash: data-hash
      }
    ))
  )
)

(define-public (revoke-credential (identity-owner principal) (credential-type (string-utf8 30)))
  (let
    (
      (credential (unwrap! (get-credential identity-owner credential-type) (err ERR_NOT_FOUND)))
    )
    (asserts! (is-eq tx-sender (get issuer credential)) (err ERR_UNAUTHORIZED))

    (ok (map-set credentials
      {
        identity-owner: identity-owner,
        credential-type: credential-type
      }
      (merge credential { revoked: true })
    ))
  )
)

(define-public (transfer-admin (new-admin principal))
  (begin
    (asserts! (is-admin) (err ERR_UNAUTHORIZED))
    (ok (var-set admin new-admin))
  )
)

