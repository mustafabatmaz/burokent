package com.burokent.dashboard.overview;

/** Made-up responses in the shape of the real sources. */
final class Fixtures {

    static final String TCMB = """
            <?xml version="1.0" encoding="UTF-8"?>
            <?xml-stylesheet type="text/xsl" href="isokur.xsl"?>
            <Tarih_Date Tarih="13.11.2026" Date="11/13/2026" Bulten_No="2026/214">
              <Currency CrossOrder="0" Kod="USD" CurrencyCode="USD">
                <Unit>1</Unit><Isim>ABD DOLARI</Isim><CurrencyName>US DOLLAR</CurrencyName>
                <ForexBuying>40.1000</ForexBuying><ForexSelling>40.2000</ForexSelling>
                <BanknoteBuying>40.0500</BanknoteBuying><BanknoteSelling>40.2500</BanknoteSelling>
                <CrossRateUSD/><CrossRateOther/>
              </Currency>
              <Currency CrossOrder="9" Kod="EUR" CurrencyCode="EUR">
                <Unit>1</Unit><Isim>EURO</Isim><CurrencyName>EURO</CurrencyName>
                <ForexBuying>44.5000</ForexBuying><ForexSelling>44.6000</ForexSelling>
                <BanknoteBuying>44.4500</BanknoteBuying><BanknoteSelling>44.6500</BanknoteSelling>
                <CrossRateUSD>1.1100</CrossRateUSD><CrossRateOther/>
              </Currency>
              <Currency CrossOrder="12" Kod="GBP" CurrencyCode="GBP">
                <Unit>1</Unit><Isim>İNGİLİZ STERLİNİ</Isim><CurrencyName>POUND STERLING</CurrencyName>
                <ForexBuying>52.0000</ForexBuying><ForexSelling>52.1000</ForexSelling>
                <BanknoteBuying/><BanknoteSelling/><CrossRateUSD/><CrossRateOther/>
              </Currency>
              <Currency CrossOrder="17" Kod="SAR" CurrencyCode="SAR">
                <Unit>1</Unit><Isim>SUUDİ ARABİSTAN RİYALİ</Isim><CurrencyName>SAUDI RIYAL</CurrencyName>
                <ForexBuying>10.6900</ForexBuying><ForexSelling>10.7100</ForexSelling>
                <BanknoteBuying/><BanknoteSelling/><CrossRateUSD/><CrossRateOther/>
              </Currency>
            </Tarih_Date>
            """;

    /** Two days in Istanbul time; 21:00Z on the 14th is already the 15th in Istanbul (UTC+3). */
    static final String MET_NO = """
            {"type":"Feature","properties":{"meta":{"updated_at":"2026-11-14T07:19:19Z"},"timeseries":[
             {"time":"2026-11-14T07:00:00Z","data":{"instant":{"details":{"air_temperature":15.7}},
              "next_1_hours":{"summary":{"symbol_code":"partlycloudy_day"}},
              "next_6_hours":{"summary":{"symbol_code":"fair_day"}}}},
             {"time":"2026-11-14T09:00:00Z","data":{"instant":{"details":{"air_temperature":19.2}},
              "next_6_hours":{"summary":{"symbol_code":"cloudy"}}}},
             {"time":"2026-11-14T15:00:00Z","data":{"instant":{"details":{"air_temperature":12.4}}}},
             {"time":"2026-11-14T21:00:00Z","data":{"instant":{"details":{"air_temperature":9.1}},
              "next_6_hours":{"summary":{"symbol_code":"rain"}}}},
             {"time":"2026-11-15T09:00:00Z","data":{"instant":{"details":{"air_temperature":17.0}},
              "next_6_hours":{"summary":{"symbol_code":"lightrain"}}}}
            ]}}
            """;

    /** The last business day has no value yet (published later in the day). */
    static final String EVDS_GOLD = """
            {"totalCount":4,"items":[
             {"Tarih":"11-11-2026","TP_ALTINPIYASA_KAP02":"6525000.00000000","UNIXTIME":{"$numberLong":"1794344400"}},
             {"Tarih":"12-11-2026","TP_ALTINPIYASA_KAP02":"6379000.00000000","UNIXTIME":{"$numberLong":"1794430800"}},
             {"Tarih":"13-11-2026","TP_ALTINPIYASA_KAP02":"6321000.00000000","UNIXTIME":{"$numberLong":"1794517200"}},
             {"Tarih":"16-11-2026","TP_ALTINPIYASA_KAP02":null,"UNIXTIME":{"$numberLong":"1794776400"}}
            ]}
            """;

    private Fixtures() {}
}
