# AgentDNAI Terms of Use

**Last Updated:** June 2026

## 1. Acceptance of Terms

By using AgentDNAI ("the Software"), you agree to be bound by these Terms of Use. If you do not agree with any part of these terms, you must not use the Software.

## 2. Description

AgentDNAI is a source-available platform for managing verifiable digital identities, granular permissions, and audit trails for AI agents. It provides:

- **Agent Identity Management** — Create, monitor, and revoke AI agent identities
- **Permission System** — Fine-grained authorization with deny-by-default policy
- **Token Management** — Temporary, scoped tokens with mandatory TTL
- **Audit Logging** — Tamper-evident hash-chained audit trail
- **Authorization Engine** — Policy-based access control with human approval workflows

## 3. Source-Available License

AgentDNAI is proprietary source-available software. Review, local evaluation, and upstream contributions are allowed; redistribution, resale, hosted third-party use, relicensing, and brand/logo reuse require prior written permission. The full license is included in the repository as `LICENSE`.

## 4. Disclaimer of Warranties

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

## 5. Security Disclaimer

While AgentDNAI implements security best practices including:

- Deny-by-default authorization
- HMAC-SHA256 token hashing
- SHA-256 hash chain audit integrity
- RSA-PSS key pairs
- Timing-safe token comparison

**No software is perfectly secure.** You are responsible for:

1. Properly configuring your deployment (HTTPS, strong secrets, etc.)
2. Regularly updating to the latest version
3. Monitoring audit logs for suspicious activity
4. Implementing additional security measures as needed for your threat model
5. Backing up your data regularly

## 6. Data Responsibility

For self-hosted deployments, you are solely responsible for:

- The security of your database and infrastructure
- Compliance with applicable data protection laws (GDPR, CCPA, etc.)
- Implementing appropriate access controls
- Data backup and disaster recovery
- Notifying affected users in case of a data breach

## 7. Acceptable Use

You agree not to use AgentDNAI to:

- Violate any applicable laws or regulations
- Infringe upon the rights of others
- Develop or deploy malicious AI agents
- Circumvent security controls or audit mechanisms
- Attempt to tamper with the audit hash chain
- Use the platform for unauthorized access to systems

## 8. Limitation of Liability

In no event shall the authors, contributors, or maintainers of AgentDNAI be liable for any direct, indirect, incidental, special, consequential, or punitive damages arising out of or related to the use of the Software, even if advised of the possibility of such damages.

## 9. Indemnification

You agree to indemnify and hold harmless the authors, contributors, and maintainers of AgentDNAI from any claims, damages, losses, or expenses arising from your use of the Software or your violation of these Terms.

## 10. Modifications

These Terms may be updated from time to time. Continued use of the Software after changes constitutes acceptance of the modified Terms. For self-hosted deployments, review the Terms in your installed version.

## 11. Severability

If any provision of these Terms is found to be unenforceable or invalid, the remaining provisions shall continue in full force and effect.

## 12. Governing Law

These Terms shall be governed by and construed in accordance with applicable laws, without regard to conflict of law principles.

## 13. Contact

For questions about these Terms, please open an issue on the GitHub repository or contact the maintainers directly.
