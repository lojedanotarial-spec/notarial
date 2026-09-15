import oci
import datetime
import os
import sys

LOG_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "oci_retry_task.log")

config = oci.config.from_file()
compute = oci.core.ComputeClient(config)

TENANCY_ID = config["tenancy"]
AVAILABILITY_DOMAIN = "pCON:SA-SAOPAULO-1-AD-1"
SUBNET_ID = "ocid1.subnet.oc1.sa-saopaulo-1.aaaaaaaaxhwjrfpqmlhytnegi4opaobuqazuduehaax4t7snl5yabbnsm2oq"
IMAGE_ID = "ocid1.image.oc1.sa-saopaulo-1.aaaaaaaav4hskmch2ikmva5wxqilujiwjsug7htb6k2silemwuzxcbwwxklq"
SSH_PUBLIC_KEY_PATH = r"C:\Users\Lucas Ojeda\.ssh\oracle_onlyoffice.pub"
DISPLAY_NAME = "onlyoffice-prod"
OCPUS = 1
MEMORY_GB = 6

def log(line):
    with open(LOG_PATH, "a", encoding="utf-8") as f:
        f.write(f"[{datetime.datetime.now()}] {line}\n")

with open(SSH_PUBLIC_KEY_PATH, "r") as f:
    ssh_public_key = f.read().strip()

launch_details = oci.core.models.LaunchInstanceDetails(
    availability_domain=AVAILABILITY_DOMAIN,
    compartment_id=TENANCY_ID,
    shape="VM.Standard.A1.Flex",
    shape_config=oci.core.models.LaunchInstanceShapeConfigDetails(ocpus=OCPUS, memory_in_gbs=MEMORY_GB),
    display_name=DISPLAY_NAME,
    create_vnic_details=oci.core.models.CreateVnicDetails(subnet_id=SUBNET_ID, assign_public_ip=True),
    source_details=oci.core.models.InstanceSourceViaImageDetails(image_id=IMAGE_ID, boot_volume_size_in_gbs=50),
    metadata={"ssh_authorized_keys": ssh_public_key},
)

try:
    response = compute.launch_instance(launch_details)
    instance = response.data
    log(f"EXITO! Instance ID: {instance.id} - state: {instance.lifecycle_state}")
    success_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "oci_instance_success.txt")
    with open(success_path, "w") as out:
        out.write(f"instance_id={instance.id}\ncreated_at={datetime.datetime.now()}\n")
    sys.exit(0)

except oci.exceptions.ServiceError as e:
    msg = str(e.message).lower() if e.message else ""
    if "out of host capacity" in msg or "out of capacity" in msg or e.status == 500:
        log(f"sin capacidad todavia (status {e.status})")
    elif e.status == 429:
        log("rate limit (429) - se salteo este intento")
    else:
        log(f"ERROR NO ESPERADO: {e.status} - {e.message}")
    sys.exit(0)  # exit 0 siempre salvo excepcion no manejada -- no queremos que Task Scheduler lo marque como fallo por un "sin capacidad" normal

except Exception as e:
    log(f"ERROR de red/otro: {type(e).__name__}: {e}")
    sys.exit(0)
