"""Offline Gregorian/astronomical calendar checks independent of datetime BCE limits."""
import datetime
import importlib.util
from decimal import Decimal
from pathlib import Path
import unittest
import contextlib
import io
import json
import tempfile
from unittest.mock import patch
spec = importlib.util.spec_from_file_location('de441', Path(__file__).with_name('import-de441.py'))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
class CalendarTests(unittest.TestCase):
    def test_standard_epoch_and_entire_positive_range(self):
        self.assertEqual(module.jd(2000,1,1),Decimal('2451544.5'))
        for year in range(1,3002):
            self.assertEqual(module.jd(year),Decimal(datetime.date(year,1,1).toordinal())+Decimal('1721424.5'))
    def test_year_zero_and_negative_400_year_cycles(self):
        self.assertEqual(module.jd(0),Decimal('1721059.5'))
        self.assertEqual(module.jd(-2000),Decimal('990574.5'))
        self.assertEqual(module.jd(-1999),Decimal('990940.5'))
        for year in range(-2000,1):
            self.assertEqual(module.jd(year+2000)-module.jd(year),Decimal(5*146097))
        self.assertEqual(module.jd(0,3,1)-module.jd(0,2,28),2)
        self.assertEqual(module.jd(-100,3,1)-module.jd(-100,2,28),1)
class DigestTests(unittest.TestCase):
    def test_offline_media_check_rejects_missing_truncated_and_corrupt_files(self):
        with tempfile.TemporaryDirectory() as directory:
            dest = Path(directory)
            media = dest / 'de441-3000.bin'
            payload = b'\x01\x00\x02\x00'
            media.write_bytes(payload)
            manifest = {'volumes': [{'file': media.name, 'bytes': len(payload), 'sha256': module.sha(media)}]}
            (dest / 'de441-source-manifest.json').write_text(json.dumps(manifest))
            with patch.object(module, 'DEST', dest), patch('sys.argv', ['import-de441.py', '--check']):
                with contextlib.redirect_stdout(io.StringIO()):
                    module.main()
                for data in [payload[:-1], b'\x02\x00\x02\x00', None]:
                    if data is None:
                        media.unlink()
                    else:
                        media.write_bytes(data)
                    with contextlib.redirect_stderr(io.StringIO()), self.assertRaises(SystemExit) as error:
                        module.main()
                    self.assertEqual(error.exception.code, 2)
if __name__ == '__main__': unittest.main()
