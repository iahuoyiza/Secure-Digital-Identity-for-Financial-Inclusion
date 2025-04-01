;; service-access.clar
;; This contract connects verified identities with financial services

;; Define data variables
(define-data-var admin principal tx-sender)
(define-map service-providers
  { provider: principal }
  {
    name: (string-utf8 50),
    active: bool,
    registered-at: uint,
    service-types: (list 10 (string-utf8 30))
  }
)

(define-map service-requirements
  {
    provider: principal,
    service-type: (string-utf8 30)
  }
  {
    required-credentials: (list 5 (string-utf8 30)),
    min-tx-count: uint,
    min-tx-volume: uint
  }
)

(define-map service-access
  {
    identity-owner: principal,
    provider: principal,
    service-type: (string-utf8 30)
  }
  {
    granted-at: uint,
    active: bool
  }
)

;; Error codes
(define-constant ERR_UNAUTHORIZED u1)
(define-constant ERR_ALREADY_EXISTS u2)
(define-constant ERR_NOT_FOUND u3)
(define-constant ERR_REQUIREMENTS_NOT_MET u4)
(define-constant ERR_INACTIVE_PROVIDER u5)

;; Read-only functions
(define-read-only (get-service-provider (provider principal))
  (map-get? service-providers { provider: provider })
)

(define-read-only (get-service-requirements (provider principal) (service-type (string-utf8 30)))
  (map-get? service-requirements { provider: provider, service-type: service-type })
)

(define-read-only (get-service-access (identity-owner principal) (provider principal) (service-type (string-utf8 30)))
  (map-get? service-access { identity-owner: identity-owner, provider: provider, service-type: service-type })
)

(define-read-only (is-admin)
  (is-eq tx-sender (var-get admin))
)

;; Public functions
(define-public (register-service-provider (name (string-utf8 50)) (service-types (list 10 (string-utf8 30))))
  (begin
    (asserts! (is-admin) (err ERR_UNAUTHORIZED))
    (asserts! (is-none (get-service-provider tx-sender)) (err ERR_ALREADY_EXISTS))
    (ok (map-insert service-providers
      { provider: tx-sender }
      {
        name: name,
        active: true,
        registered-at: block-height,
        service-types: service-types
      }
    ))
  )
)

(define-public (deactivate-service-provider (provider principal))
  (begin
    (asserts! (is-admin) (err ERR_UNAUTHORIZED))
    (let
      (
        (provider-info (unwrap! (get-service-provider provider) (err ERR_NOT_FOUND)))
      )
      (ok (map-set service-providers
        { provider: provider }
        (merge provider-info { active: false })
      ))
    )
  )
)

(define-public (set-service-requirements
  (service-type (string-utf8 30))
  (required-credentials (list 5 (string-utf8 30)))
  (min-tx-count uint)
  (min-tx-volume uint)
)
  (let
    (
      (provider-info (unwrap! (get-service-provider tx-sender) (err ERR_NOT_FOUND)))
    )
    (asserts! (get active provider-info) (err ERR_INACTIVE_PROVIDER))
    (ok (map-set service-requirements
      {
        provider: tx-sender,
        service-type: service-type
      }
      {
        required-credentials: required-credentials,
        min-tx-count: min-tx-count,
        min-tx-volume: min-tx-volume
      }
    ))
  )
)

(define-public (request-service-access
  (identity-owner principal)
  (provider principal)
  (service-type (string-utf8 30))
)
  (let
    (
      (provider-info (unwrap! (get-service-provider provider) (err ERR_NOT_FOUND)))
      (requirements (unwrap! (get-service-requirements provider service-type) (err ERR_NOT_FOUND)))
    )
    (asserts! (get active provider-info) (err ERR_INACTIVE_PROVIDER))
    (asserts! (is-none (get-service-access identity-owner provider service-type)) (err ERR_ALREADY_EXISTS))

    ;; Check if requirements are met (this would call other contracts in a real implementation)
    (asserts! (check-requirements identity-owner requirements) (err ERR_REQUIREMENTS_NOT_MET))

    (ok (map-insert service-access
      {
        identity-owner: identity-owner,
        provider: provider,
        service-type: service-type
      }
      {
        granted-at: block-height,
        active: true
      }
    ))
  )
)

(define-public (revoke-service-access
  (identity-owner principal)
  (service-type (string-utf8 30))
)
  (let
    (
      (access-info (unwrap! (get-service-access identity-owner tx-sender service-type) (err ERR_NOT_FOUND)))
    )
    (ok (map-set service-access
      {
        identity-owner: identity-owner,
        provider: tx-sender,
        service-type: service-type
      }
      (merge access-info { active: false })
    ))
  )
)

(define-public (transfer-admin (new-admin principal))
  (begin
    (asserts! (is-admin) (err ERR_UNAUTHORIZED))
    (ok (var-set admin new-admin))
  )
)

;; Private functions
(define-private (check-requirements (identity-owner principal) (requirements { required-credentials: (list 5 (string-utf8 30)), min-tx-count: uint, min-tx-volume: uint }))
  ;; In a real implementation, this would check the identity's credentials and transaction history
  ;; For simplicity, we'll just return true in this example
  true
)

