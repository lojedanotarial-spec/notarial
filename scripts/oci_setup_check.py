import oci

config = oci.config.from_file()
identity = oci.identity.IdentityClient(config)
compute = oci.core.ComputeClient(config)
network = oci.core.VirtualNetworkClient(config)

tenancy_id = config["tenancy"]

print("=== Availability domains ===")
ads = identity.list_availability_domains(tenancy_id).data
for ad in ads:
    print(ad.name)

print("\n=== Existing VCNs in root compartment ===")
vcns = network.list_vcns(tenancy_id).data
for v in vcns:
    print(f"{v.display_name} | {v.id} | state={v.lifecycle_state}")
    subnets = network.list_subnets(tenancy_id, vcn_id=v.id).data
    for s in subnets:
        print(f"    subnet: {s.display_name} | {s.id} | public={not s.prohibit_public_ip_on_vnic} | state={s.lifecycle_state}")

print("\n=== Ubuntu 24.04 aarch64 images ===")
images = compute.list_images(
    tenancy_id,
    operating_system="Canonical Ubuntu",
    operating_system_version="24.04",
    shape="VM.Standard.A1.Flex",
).data
for img in images[:5]:
    print(f"{img.display_name} | {img.id} | created={img.time_created}")

print("\n=== Existing instances ===")
instances = compute.list_instances(tenancy_id).data
for i in instances:
    print(f"{i.display_name} | {i.id} | state={i.lifecycle_state}")
