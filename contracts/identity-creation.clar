;; identity-creation.clar
;; This contract handles the creation and management of digital identities

;; Define data variables
(define-data-var admin principal tx-sender)
(define-map identities
  { owner: principal }
  {
    created-at: uint,
    active: bool
  }
)

;; Error codes
(define-constant ERR_UNAUTHORIZED u1)
(define-constant ERR_ALREADY_EXISTS u2)
(define-constant ERR_NOT_FOUND u3)

;; Read-only functions
(define-read-only (get-identity (owner principal))
  (map-get? identities { owner: owner })
)

(define-read-only (is-admin)
  (is-eq tx-sender (var-get admin))
)

;; Public functions
(define-public (create-identity)
  (let
    (
      (exists (is-some (get-identity tx-sender)))
    )
    (asserts! (not exists) (err ERR_ALREADY_EXISTS))
    (ok (map-insert identities
      { owner: tx-sender }
      {
        created-at: block-height,
        active: true
      }
    ))
  )
)

(define-public (deactivate-identity (owner principal))
  (let
    (
      (identity (unwrap! (get-identity owner) (err ERR_NOT_FOUND)))
    )
    (asserts! (or (is-eq tx-sender owner) (is-admin)) (err ERR_UNAUTHORIZED))
    (ok (map-set identities
      { owner: owner }
      (merge identity { active: false })
    ))
  )
)

(define-public (reactivate-identity (owner principal))
  (let
    (
      (identity (unwrap! (get-identity owner) (err ERR_NOT_FOUND)))
    )
    (asserts! (or (is-eq tx-sender owner) (is-admin)) (err ERR_UNAUTHORIZED))
    (ok (map-set identities
      { owner: owner }
      (merge identity { active: true })
    ))
  )
)

(define-public (transfer-admin (new-admin principal))
  (begin
    (asserts! (is-admin) (err ERR_UNAUTHORIZED))
    (ok (var-set admin new-admin))
  )
)

