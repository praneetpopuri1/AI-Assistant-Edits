import boto3

s3 = boto3.client("s3")

response = s3.list_objects_v2(Bucket="aiedit-praneet-video-upload-bucket-890988597138-us-east-2-an", MaxKeys=5)
print(response)