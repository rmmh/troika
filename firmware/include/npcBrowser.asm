; Static-address autonomous browser. Physical boot key gates initial startup;
; subsequent visits and retry deadlines are entirely native. Same browser/VM.
; 2321..2328 are unused by the DNS client (whose final cell is TTL at 2320).
$npc_due: 2321
$npc_active: 2324
$npc_visits: 2325
$npc_errors: 2326
$npc_status: 2327
$npc_attempts: 2328
npc_entry:
      R E 68 N E 4 J npc_entry R E 69 M S 5710
      W net_ifaces 95 W net_iface_count 1 W 2067 1 W 2068 3 W 2069 6
      W 2070 1 W 2071 3 W 2072 9 W 2073 1 W 2074 3 W 2075 3
      W serial_unit Z W serial_volume Z W 2544 Z W 2545 7
      C S browser_init ifl A Z J npc_fatal end J npc_open
npc_loop:
      C S browser_network R E npc_active E E Z J npc_wait
      C S browser_step ifl A Z J npc_error end
      R E bu_state N E 4 J npc_loop R E f_action N E Z J npc_loop R E 5446 N E 1 J npc_loop
      R E npc_visits ifl E 9841 I E 1 W npc_visits E end W npc_status 1 J npc_delay
npc_error:
      W npc_status A R E npc_errors ifl E 9841 I E 1 W npc_errors E end
npc_delay:
      W npc_active Z C S net_now M A net_tick M B 2187 M C npc_due C S net_add_ticks ifl A Z J npc_fatal end
npc_wait:
      C S net_now M A net_tick M B npc_due C S wide_compare ifl A Z J npc_loop end
npc_open:
      R E npc_attempts ifl E 9841 I E 1 W npc_attempts E end
      M A @npc_home M B 22 C S browser_open ifl A Z J npc_error end W npc_active 1 J npc_loop
npc_fatal: W npc_status A W bu_status A W bu_state -2 H 0sAAA Z
; Static configuration intentionally does not participate in DHCP.
dhcp_client_input: O S P
dhcp_client_service: O S P
npc_home: "http://bbs.world/board"
