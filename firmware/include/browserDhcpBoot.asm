; Example world browser startup: NIC Q, disk unit 0, system volume [0,0,1],
; DHCP address policy and home page http://bbs.world/index. All work is native.
; Enter browser_entry with this module linked alongside browser.asm.
browser_entry:
      M S 5710 W net_ifaces 95 W net_iface_count 1
      W serial_unit Z W serial_volume Z W 2544 Z W 2545 1
      C S browser_init ifl A Z J browser_boot_failed end
      C S dhcp_client_start ifl A Z J browser_boot_failed end
browser_boot_wait:
      C S browser_network R E dhcpc_state N E 3 J browser_boot_wait
      M A @browser_home M B 22 C S browser_open ifl A Z J browser_boot_failed end
browser_boot_loop:
      C S browser_step ifl A Z J browser_boot_failed end J browser_boot_loop
browser_boot_failed: W bu_status A W bu_state -1 H 0sAAA Z
browser_home: "http://bbs.world/index"
