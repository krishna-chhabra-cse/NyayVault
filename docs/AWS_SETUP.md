# AWS Setup Guide: NyayVault

Takes about 20 minutes in the AWS Console and stays within the Free Tier. Do the steps in order.

> **Region:** create everything in the **same region as your EC2 instance**. Check it in
> EC2 → Instances (the "Availability Zone" column, e.g. `us-east-1a` means region `us-east-1`).
> Below, `<region>` means that value.

---

## 1. Create the S3 evidence bucket

S3 → **Create bucket**

| Setting | Value |
|---|---|
| Bucket type | General purpose |
| Bucket name | `nyayvault-evidence-<something-unique>`, e.g. `nyayvault-evidence-tiet-2026` (names are global) |
| Region | `<region>` |
| Object Ownership | ACLs disabled (recommended) |
| Block *all* public access | ✅ **On** |
| Bucket Versioning | ✅ **Enable** |
| Default encryption | SSE-S3 (Amazon S3 managed keys), Bucket Key: Enable |
| Object Lock | Leave off (it can't be undone; versioning is enough for the demo) |

Click **Create bucket**. Write down the name.

## 2. Create the IAM role for EC2

IAM → **Policies** → **Create policy** → JSON tab, paste this (replace `BUCKET` and `<region>`):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "EvidenceBucketList",
      "Effect": "Allow",
      "Action": ["s3:ListBucket"],
      "Resource": "arn:aws:s3:::BUCKET"
    },
    {
      "Sid": "EvidenceObjects",
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::BUCKET/*"
    },
    {
      "Sid": "SseKmsViaS3",
      "Effect": "Allow",
      "Action": ["kms:GenerateDataKey", "kms:Decrypt"],
      "Resource": "*",
      "Condition": { "StringEquals": { "kms:ViaService": "s3.<region>.amazonaws.com" } }
    }
  ]
}
```

Name it `NyayVaultEvidenceAccess` → Create.

IAM → **Roles** → **Create role** → Trusted entity: *AWS service*, Use case: **EC2** → Next →
attach `NyayVaultEvidenceAccess` (optionally also `CloudWatchAgentServerPolicy`) → name it
`NyayVaultEC2Role` → Create.

## 3. Attach the role to the EC2 instance

EC2 → Instances → select the instance → **Actions → Security → Modify IAM role** →
choose `NyayVaultEC2Role` → **Update IAM role**. No reboot needed.

## 4. Update the server `.env` on EC2

SSH in and edit `~/server/.env`:

```bash
ssh -i <key.pem> ubuntu@<ec2-ip>
nano ~/server/.env
```

Set or replace:

```env
AWS_REGION=<region>
AWS_S3_BUCKET_NAME=<your bucket name>
```

**Delete** (or comment out with `#`) these lines so the IAM role is used instead of keys:

```env
# AWS_S3_ENDPOINT=...
# AWS_ACCESS_KEY_ID=...
# AWS_SECRET_ACCESS_KEY=...
```

Also delete `PINATA_JWT` / `GATEWAY_URL` if present (no longer used). If the old IAM user's
access keys still exist under IAM → Users → Security credentials, **deactivate/delete them**.

## 5. Deploy and verify

From the project folder on your laptop (PowerShell):

```powershell
$env:EC2_KEY_PATH = "C:\path\to\key.pem"
$env:EC2_HOST = "ubuntu@<ec2-ip>"
./deploy_backend.ps1
```

The health check printed at the end should show:

```json
"storage": { "driver": "Amazon S3", "bucket": "<your bucket>", "auth": "IAM role (instance profile)", "isLocal": false }
```

Then copy the evidence that was saved on the EC2 disk while the old bucket was missing:

```bash
ssh -i <key.pem> ubuntu@<ec2-ip> "cd ~/server && node scripts/sync_local_to_s3.js"
```

Open S3 → your bucket → `cases/…` and you should see the evidence files.

## 6. CloudWatch (monitoring)

- EC2 → select the instance → **Monitoring** tab: CPU, network and status checks (free basic monitoring).
- CloudWatch → **Alarms → Create alarm** → metric *EC2 → Per-Instance → StatusCheckFailed* for your
  instance → threshold `>= 1` for 1 datapoint → notify an SNS topic with your email → name
  `nyayvault-ec2-health`. (10 alarms are free.)

## Demo checklist for the evaluation

1. `https://nyayvault.in/api/health` shows **Amazon S3** + **IAM role**.
2. Log in as `POL-1` and upload a file → open S3 in the console → the object is under `cases/<id>/documents/…`;
   its Properties tab shows *Server-side encryption: SSE-S3*.
3. Upload again with **Sensitive Medical / Forensic** ticked → that object shows *SSE-KMS*.
4. Click the tamper demo → the integrity check turns red → restore → green. Then show the
   **Versions** toggle in S3: every version of the object is kept.
5. Show IAM → Roles → `NyayVaultEC2Role` (no access keys on the server), and the CloudWatch alarm.

## Cost / clean-up

A t2.micro / t3.micro EC2 instance, a few MB in S3, and one alarm are all within the Free Tier. After the
evaluation you can stop the instance; empty the bucket (including old versions) before deleting it.
