import oci
import time
import datetime
import sys

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
RETRY_INTERVAL_SECONDS = 75
MAX_ATTEMPTS = 4608  # ~96 hours (4 dias) at 75s interval

with open(SSH_PUBLIC_KEY_PATH, "r") as f:
    ssh_public_key = f.read().strip()

launch_details = oci.core.models.LaunchInstanceDetails(
    availability_domain=AVAILABILITY_DOMAIN,
    compartment_id=TENANCY_ID,
    shape="VM.Standard.A1.Flex",
    shape_config=oci.core.models.LaunchInstanceShapeConfigDetails(
        ocpus=OCPUS,
        memory_in_gbs=MEMORY_GB,
    ),
    display_name=DISPLAY_NAME,
    create_vnic_details=oci.core.models.CreateVnicDetails(
        subnet_id=SUBNET_ID,
        assign_public_ip=True,
    ),
    source_details=oci.core.models.InstanceSourceViaImageDetails(
        image_id=IMAGE_ID,
        boot_volume_size_in_gbs=50,
    ),
    metadata={
        "ssh_authorized_keys": ssh_public_key,
    },
)

print(f"[{datetime.datetime.now()}] Arrancando loop de reintento. Intervalo: {RETRY_INTERVAL_SECONDS}s, max intentos: {MAX_ATTEMPTS}", flush=True)

for attempt in range(1, MAX_ATTEMPTS + 1):
    try:
        response = compute.launch_instance(launch_details)
        instance = response.data
        print(f"\n[{datetime.datetime.now()}] EXITO en el intento {attempt}!", flush=True)
        print(f"Instance ID: {instance.id}", flush=True)
        print(f"Lifecycle state: {instance.lifecycle_state}", flush=True)

        with open("oci_instance_success.txt", "w") as out:
            out.write(f"instance_id={instance.id}\n")
            out.write(f"created_at={datetime.datetime.now()}\n")
            out.write(f"attempts={attempt}\n")

        sys.exit(0)

    except oci.exceptions.ServiceError as e:
        msg = str(e.message).lower() if e.message else ""
        is_capacity_error = (
            "out of host capacity" in msg
            or "out of capacity" in msg
            or e.status == 500
        )
        if is_capacity_error:
            print(f"[{datetime.datetime.now()}] Intento {attempt}/{MAX_ATTEMPTS}: sin capacidad todavia. Reintentando en {RETRY_INTERVAL_SECONDS}s...", flush=True)
        elif e.status == 429:
            cooldown = 300
            print(f"[{datetime.datetime.now()}] Intento {attempt}/{MAX_ATTEMPTS}: rate limit (429). Pausa de {cooldown}s antes de reintentar...", flush=True)
            time.sleep(cooldown)
        else:
            print(f"[{datetime.datetime.now()}] ERROR NO ESPERADO (no es de capacidad): {e.status} - {e.message}", flush=True)
            print("Deteniendo el script, esto necesita revision manual.", flush=True)
            sys.exit(1)

    except (oci.exceptions.ConnectTimeout, oci.exceptions.RequestException, ConnectionError) as e:
        print(f"[{datetime.datetime.now()}] Intento {attempt}/{MAX_ATTEMPTS}: corte de red/timeout ({type(e).__name__}). Reintentando en {RETRY_INTERVAL_SECONDS}s...", flush=True)

    time.sleep(RETRY_INTERVAL_SECONDS)

print(f"[{datetime.datetime.now()}] Se agotaron los {MAX_ATTEMPTS} intentos sin conseguir capacidad.", flush=True)
sys.exit(2)
