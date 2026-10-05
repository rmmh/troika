"""Offline checks against independently transcribed NASA catalog rows."""
import importlib.util
from io import BytesIO
from pathlib import Path
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('eclipses', Path(__file__).with_name('import-eclipses.py'))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class ImportTests(unittest.TestCase):
    def parse(self, kind, row):
        with patch.object(module.urllib.request, 'urlopen', return_value=BytesIO(row.encode())):
            return module.fetch(kind, 2001)[1][0]

    def test_total_solar_and_html_links(self):
        event = self.parse('SE', '<a>09561</a> 2024 Apr 08 <b>18:18:29</b> 74 300 139 T n- 0.3431 1.0566 25N 104W 70 198 04m28s')
        self.assertEqual((event['year'], event['month'], event['day'], event['td']), (2024,4,8,'18:18:29'))
        self.assertEqual((event['gamma1e4'],event['magnitude1e4']), (3431,10566))
        self.assertEqual((event['latitudeDegrees'],event['longitudeDegrees'],event['centralDurationSeconds']), (25,-104,268))
        self.assertEqual(event['deltaTSeconds'],74)

    def test_partial_solar_has_no_central_path(self):
        event = self.parse('SE', '09563 2025 Mar 29 10:48:36 75 312 149 P t- 1.0405 0.9376 61N 77W 0')
        self.assertIsNone(event['centralDurationSeconds'])
        self.assertIsNone(event['pathWidthKm'])
        self.assertEqual(event['magnitude1e4'],9376)

    def test_lunar_durations_keep_tenths(self):
        event = self.parse('LE', '09706 2025 Mar 14 06:59:56 75 311 123 T -p 0.3484 2.2595 1.1784 362.6 218.3 65.4 3N 102W')
        self.assertEqual((event['penumbralMagnitude1e4'],event['umbralMagnitude1e4']), (22595,11784))
        self.assertEqual((event['penumbralDurationTenthsMinutes'],event['partialDurationTenthsMinutes'],event['totalDurationTenthsMinutes']), (3626,2183,654))

    def test_unexpected_source_precision_is_rejected(self):
        with self.assertRaises(ValueError): module.scaled('0.12345',4)
        self.assertEqual(module.scaled('-0.0012',4),-12)

if __name__ == '__main__': unittest.main()
