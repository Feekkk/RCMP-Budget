# THIS IS REQUEST QUOTATION WORKFLOW

```mermaid
flowchart TD
    USER[USER] -->|submit (item + quantity) | PROC[PROCUREMENT]
    PROC -->|price| USER
    USER -->|generate PRF| END[Endorser]
    END -->|< RM50,000| HOD[HOD]
    END -->|< RM200,000| HOCD[HOCD]
    END -->|> RM200,000| CEO[CEO]
    HOD --> FIN[Finance]
    HOCD --> FIN
    CEO --> FIN
```

### Quotation Form
- Item
- Quantity
- Price per unit