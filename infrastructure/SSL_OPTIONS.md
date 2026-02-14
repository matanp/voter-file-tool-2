# SSL Configuration Options

The report-server supports three SSL/HTTPS configurations:

## 1. HTTP Only (No SSL) - Default for IP addresses

**When to use:** When you only have an IP address and don't need encryption.

**Configuration:**
```hcl
domain_name = ""
use_ssl = false
use_self_signed_ssl = false
```

**Pros:**
- Simplest setup
- No certificate management
- Works immediately

**Cons:**
- No encryption (data sent in plain text)
- Not suitable for production with sensitive data

## 2. Self-Signed SSL Certificate

**When to use:** When you want encryption but don't have a domain name.

**Configuration:**
```hcl
domain_name = ""
use_ssl = false
use_self_signed_ssl = true
```

**Pros:**
- Provides encryption
- Works with IP addresses
- No external dependencies

**Cons:**
- Browsers will show security warnings
- Users must manually accept the certificate
- Not suitable for public-facing production

## 3. Let's Encrypt SSL (Recommended for Production)

**When to use:** When you have a domain name pointing to your server.

**Configuration:**
```hcl
domain_name = "your-domain.com"
use_ssl = true
use_self_signed_ssl = false
```

**Pros:**
- Free, trusted certificates
- No browser warnings
- Automatic renewal
- Production-ready

**Cons:**
- Requires a domain name
- Domain must point to server IP
- Initial setup requires certbot

**Setup Steps:**
1. Point your domain's A record to the server IP
2. Wait for DNS propagation
3. Run: `sudo certbot --nginx -d your-domain.com`

## Getting a Free Domain

If you don't have a domain, consider:
- **No-IP** (free dynamic DNS)
- **DuckDNS** (free subdomain)
- **Cloudflare** (free domain registration for some TLDs)

## Recommendation

- **Development/Testing:** Use HTTP-only or self-signed SSL
- **Production:** Use Let's Encrypt with a proper domain name
