; Dedicated LOAD/SUBMIT execution phase. No UI/image gate may be live here.
phase_entry:
      E B Z J wf_load E B 1 J wf_submit M A -119 O S P
wf_load: M A @wf_load_name M B 4 M E Z J wf_event
wf_submit: M A @wf_submit_name M B 6 M E 1
wf_event:
      R F pp_valid N F 1 J pp_bad
      W f_action Z W f_action_ptr Z W f_action_len Z
      U S E C S f_find O S E
      ife A 1 E E Z J pp_ok M A 25 J f_browser end
      N A Z O S P M A C J f_invoke
wf_load_name: "LOAD"
wf_submit_name: "SUBMIT"
