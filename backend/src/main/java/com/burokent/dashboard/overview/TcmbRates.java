package com.burokent.dashboard.overview;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import javax.xml.XMLConstants;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.parsers.ParserConfigurationException;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.NodeList;
import org.xml.sax.SAXException;

/** Reads the central bank's daily rates file (today.xml). */
final class TcmbRates {

    /** The currencies the start page shows, in this order. */
    static final List<String> SHOWN = List.of("USD", "EUR", "SAR");

    private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("dd.MM.yyyy");

    private TcmbRates() {}

    static ExchangeRates parse(String xml) {
        Document document = read(xml);
        Element root = document.getDocumentElement();
        LocalDate date;
        try {
            date = LocalDate.parse(root.getAttribute("Tarih"), DATE);
        } catch (RuntimeException e) {
            throw new FeedException("No date in the rates file", e);
        }
        NodeList currencies = root.getElementsByTagName("Currency");
        List<ExchangeRates.Rate> rates = new ArrayList<>();
        for (String code : SHOWN) {
            for (int i = 0; i < currencies.getLength(); i++) {
                Element currency = (Element) currencies.item(i);
                if (code.equals(currency.getAttribute("Kod"))) {
                    rates.add(new ExchangeRates.Rate(
                            code, decimal(currency, "ForexBuying"), decimal(currency, "ForexSelling")));
                }
            }
        }
        if (rates.isEmpty()) {
            throw new FeedException("None of the shown currencies in the rates file");
        }
        return new ExchangeRates(date, List.copyOf(rates));
    }

    /** No document type declarations at all: they are how external entities (XXE) get in. */
    private static Document read(String xml) {
        try {
            DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
            factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
            factory.setFeature(XMLConstants.FEATURE_SECURE_PROCESSING, true);
            factory.setXIncludeAware(false);
            factory.setExpandEntityReferences(false);
            return factory.newDocumentBuilder().parse(new ByteArrayInputStream(xml.getBytes(StandardCharsets.UTF_8)));
        } catch (ParserConfigurationException | SAXException | IOException e) {
            throw new FeedException("Unreadable rates file", e);
        }
    }

    private static BigDecimal decimal(Element currency, String tag) {
        NodeList nodes = currency.getElementsByTagName(tag);
        String text =
                nodes.getLength() == 0 ? "" : nodes.item(0).getTextContent().trim();
        try {
            return new BigDecimal(text);
        } catch (NumberFormatException e) {
            throw new FeedException("No " + tag + " for " + currency.getAttribute("Kod"), e);
        }
    }
}
